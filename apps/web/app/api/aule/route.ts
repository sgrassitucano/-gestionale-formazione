import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { parseXlsxFile } from "@gestionale/utils/xlsx-parser";
import { validateDiscentiRows } from "@gestionale/utils/discenti-validator";
import { z } from "zod";

const docenteAssignSchema = z.object({
  docenteId: z.string(),
  oreEffettiveDocenza: z.number().min(0),
  trasferAcosto: z.number().min(0).default(0),
});

const createAulaMetaSchema = z.object({
  corsoCodec: z.string(),
  modalita: z.enum(["PRESENZA", "FAD_SINCRONA", "FAD_ASINCRONA"]),
  luogo: z.string().min(1),
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

  const aule = await db.aula.findMany({
    where,
    include: {
      corso: true,
      iscrizioni: { where: { deletedAt: null } },
      docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

    const aula = await db.$transaction(async (tx) => {
      const newAula = await tx.aula.create({
        data: {
          corsoCodec: meta.corsoCodec,
          modalita: meta.modalita as any,
          luogo: meta.luogo,
          dataInizio: new Date(meta.dataInizio),
          costoAffitto: meta.costoAffitto,
          creatoDay: user.id,
          stato: "PIANIFICATA",
        },
      });

      for (const discente of validationResult.valid) {
        const rowIdx = validationResult.valid.indexOf(discente);
        const rowData = parseResult.rows[rowIdx];
        const aziendaNome = rowData.azienda || "Default";

        let azienda = await tx.azienda.findFirst({ where: { ragioneSociale: aziendaNome } });
        if (!azienda) {
          azienda = await tx.azienda.create({
            data: { ragioneSociale: aziendaNome, pIva: "UNKNOWN", codiceFiscale: "UNKNOWN" },
          });
        }

        const savedDiscente = await tx.discente.upsert({
          where: { codiceFiscale: discente.codiceFiscale },
          create: { ...discente, aziendaId: azienda.id },
          update: {
            nome: discente.nome,
            cognome: discente.cognome,
            dataNascita: discente.dataNascita,
            email: discente.email,
            cellulare: discente.cellulare,
          },
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
    });

    return NextResponse.json({ success: true, aula, discentiCount: validationResult.valid.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Create aula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
