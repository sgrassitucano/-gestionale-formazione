import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { parseXlsxFile } from "@gestionale/utils/xlsx-parser";
import { validateDiscentiRows } from "@gestionale/utils/discenti-validator";
import { blindIndex } from "@gestionale/utils/encryption";
import { z } from "zod";

const docenteAssignSchema = z.object({
  docenteId: z.string(),
  oreEffettiveDocenza: z.number().min(0),
  trasferAcosto: z.number().min(0).default(0),
});

const createAulaMetaSchema = z.object({
  corsoCodec: z.string(),
  modalita: z.enum(["PRESENZA", "FAD_SINCRONA", "FAD_ASINCRONA"]),
  luogoId: z.string().min(1),
  dataInizio: z.string(),
  costoAffitto: z.number().min(0).default(0),
  docenti: z.array(docenteAssignSchema).default([]),
});

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const stato = searchParams.get("stato");
  const corsoCodec = searchParams.get("corso");

  const where: any = { deletedAt: null };
  if (stato) where.stato = stato;
  if (corsoCodec) where.corsoCodec = corsoCodec;

  const aule = await withUserContext(user, (tx) =>
    tx.aula.findMany({
      where,
      include: {
        corso: true,
        luogo: true,
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  );

  return NextResponse.json({ success: true, aule });
}

// Crea aula in un colpo: metadati + upload XLS discenti (con cantiere/sottocantiere/responsabile) + docenti
export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metaRaw = formData.get("meta") as string;

    if (!file || !metaRaw) {
      return NextResponse.json({ error: "file e meta sono richiesti" }, { status: 400 });
    }

    const meta = createAulaMetaSchema.parse(JSON.parse(metaRaw));
    const buffer = Buffer.from(await file.arrayBuffer());

    const parseResult = await parseXlsxFile(buffer);
    if (parseResult.errors.length > 0) {
      return NextResponse.json({ success: false, errors: parseResult.errors }, { status: 400 });
    }

    const validationResult = validateDiscentiRows(parseResult.rows);
    if (validationResult.errors.length > 0) {
      return NextResponse.json({ success: false, errors: validationResult.errors }, { status: 400 });
    }

    // Limite massimo discenti per aula (vedi automazione_formazione_launcher,
    // che normalmente splitta un caricamento massivo in più aule prima di
    // arrivare qui). Questo endpoint di creazione manuale non aveva nessun
    // limite: un XLSX con più di 35 righe creava un'aula sovraffollata.
    const MAX_DISCENTI_PER_AULA = 35;
    if (validationResult.valid.length > MAX_DISCENTI_PER_AULA) {
      return NextResponse.json(
        {
          success: false,
          errors: [`Troppi discenti (${validationResult.valid.length}): massimo ${MAX_DISCENTI_PER_AULA} per aula, splittare in più caricamenti`],
        },
        { status: 400 }
      );
    }

    const aula = await withUserContext(
      user,
      async (tx) => {
      const newAula = await tx.aula.create({
        data: {
          corsoCodec: meta.corsoCodec,
          modalita: meta.modalita as any,
          luogoId: meta.luogoId,
          dataInizio: new Date(meta.dataInizio),
          costoAffitto: meta.costoAffitto,
          creatoDay: user.id,
          stato: "PIANIFICATA",
        },
      });

      for (const discente of validationResult.valid) {
        const rowIdx = validationResult.valid.indexOf(discente);
        const rowData = parseResult.rows[rowIdx];
        const aziendaNome = (rowData.azienda || "Default").trim();

        // Match case/spazi-insensitive: senza, "ACME Srl" e "ACME srl "
        // finivano su due righe Azienda distinte invece di essere unite,
        // frammentando i Centri Costo per la stessa azienda reale.
        let azienda = await tx.azienda.findFirst({
          where: { ragioneSociale: { equals: aziendaNome, mode: "insensitive" }, deletedAt: null },
        });
        if (!azienda) {
          azienda = await tx.azienda.create({
            data: { ragioneSociale: aziendaNome, pIva: "UNKNOWN", codiceFiscale: "UNKNOWN" },
          });
        }

        const { id: _discenteId, ...discenteData } = discente;
        // `as any` su dataNascita: a livello applicativo è sempre un Date
        // (vedi @gestionale/types Discente, decifraValore la ricostruisce
        // sempre come Date dopo la lettura), ma la colonna DB e il tipo
        // Prisma sono String (deve contenere ciphertext, non un vero
        // DateTime — vedi commento su Discente.dataNascita in schema.prisma).
        // Il middleware di cifratura converte il Date in ISO string prima
        // di scriverlo davvero; Prisma non può saperlo staticamente.
        const savedDiscente = await tx.discente.upsert({
          where: { codiceFiscaleHash: blindIndex(discente.codiceFiscale) },
          create: { ...discenteData, aziendaId: azienda.id, codiceFiscaleHash: blindIndex(discente.codiceFiscale) } as any,
          // aziendaId e deletedAt vanno riaggiornati anche in update: senza,
          // una persona che cambia azienda tra un import e l'altro resta
          // agganciata alla vecchia (rompe Centri Costo silenziosamente), e
          // un discente soft-eliminato reimportato resterebbe invisibile
          // nelle liste pur avendo i dati aggiornati.
          update: { ...discenteData, aziendaId: azienda.id, deletedAt: null } as any,
        });

        await tx.iscrizioneAula.create({
          data: {
            aulaId: newAula.id,
            discenteId: savedDiscente.id,
            cantiere: rowData.cantiere || undefined,
            sottocantiere: rowData.sottocantiere || undefined,
            responsabile: rowData.responsabile || undefined,
          },
        });
      }

      for (const d of meta.docenti) {
        await tx.docenteLezione.create({
          data: {
            aulaId: newAula.id,
            docenteId: d.docenteId,
            oreEffettiveDocenza: d.oreEffettiveDocenza,
            trasferAcosto: d.trasferAcosto,
          },
        });
      }

      await tx.logAudit.create({
        data: {
          utenteId: user.id,
          azione: "CREA_AULA",
          tabella: "Aula",
          recordId: newAula.id,
          dettagli: { discentiCount: validationResult.valid.length, docentiCount: meta.docenti.length },
        },
      });

      return newAula;
      },
      // Default Prisma 5000ms non basta con molti discenti (fino a
      // MAX_DISCENTI_PER_AULA=35): ogni riga fa lookup+upsert azienda,
      // upsert discente cifrato, insert iscrizione, tutto sequenziale
      // nella stessa transazione. Stesso limite già risolto per
      // l'export/import backup.
      { timeout: 30000 }
    );

    return NextResponse.json({ success: true, aula, discentiCount: validationResult.valid.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Create aula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
