import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { parseXlsxFile } from "@gestionale/utils/xlsx-parser";
import { validateDiscentiRows } from "@gestionale/utils/discenti-validator";
import { blindIndex } from "@gestionale/utils/encryption";

// Stesso limite enforcement di POST /api/aule (creazione) e POST .../iscrizioni
// (aggiunta singola): qui si applica al TOTALE (già iscritti + nuovi dal file).
const MAX_DISCENTI_PER_AULA = 35;

// Import XLS di discenti in un'aula ESISTENTE (a differenza di POST /api/aule,
// che importa solo in fase di creazione). Stessa logica di parsing/upsert,
// ma senza creare una nuova Aula: aggiunge iscrizioni a quella indicata.
export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "file richiesto" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = await parseXlsxFile(buffer);
    if (parseResult.errors.length > 0) {
      return NextResponse.json({ success: false, errors: parseResult.errors }, { status: 400 });
    }

    const validationResult = validateDiscentiRows(parseResult.rows);
    if (validationResult.errors.length > 0) {
      return NextResponse.json({ success: false, errors: validationResult.errors }, { status: 400 });
    }

    const result = await withUserContext(
      user,
      async (tx) => {
        const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
        if (!aula || aula.deletedAt) {
          return { status: 404 as const, body: { error: "Aula non trovata" } };
        }
        if (aula.stato === "CONCLUSA") {
          return { status: 409 as const, body: { error: "Aula conclusa: elenco discenti non più modificabile" } };
        }

        const attuali = await tx.iscrizioneAula.count({ where: { aulaId: params.aulaId, deletedAt: null } });
        if (attuali + validationResult.valid.length > MAX_DISCENTI_PER_AULA) {
          return {
            status: 409 as const,
            body: {
              error: `Limite massimo di ${MAX_DISCENTI_PER_AULA} discenti per aula: già ${attuali} iscritti, il file ne aggiunge ${validationResult.valid.length}`,
            },
          };
        }

        let aggiunti = 0;
        for (const discente of validationResult.valid) {
          const rowIdx = validationResult.valid.indexOf(discente);
          const rowData = parseResult.rows[rowIdx];
          const aziendaNome = (rowData.azienda || "Default").trim();

          let azienda = await tx.azienda.findFirst({
            where: { ragioneSociale: { equals: aziendaNome, mode: "insensitive" }, deletedAt: null },
          });
          if (!azienda) {
            azienda = await tx.azienda.create({
              data: { ragioneSociale: aziendaNome, pIva: "UNKNOWN", codiceFiscale: "UNKNOWN" },
            });
          }

          const { id: _discenteId, ...discenteData } = discente;
          const savedDiscente = await tx.discente.upsert({
            where: { codiceFiscaleHash: blindIndex(discente.codiceFiscale) },
            create: { ...discenteData, aziendaId: azienda.id, codiceFiscaleHash: blindIndex(discente.codiceFiscale) } as any,
            update: { ...discenteData, aziendaId: azienda.id, deletedAt: null } as any,
          });

          // Evita doppioni: se il discente è già iscritto a quest'aula, salta
          // (comportamento coerente con l'aggiunta singola, che blocca solo
          // a livello UI ma qui va enforced anche lato import massivo).
          const giaIscritto = await tx.iscrizioneAula.findFirst({
            where: { aulaId: params.aulaId, discenteId: savedDiscente.id, deletedAt: null },
          });
          if (giaIscritto) continue;

          await tx.iscrizioneAula.create({
            data: {
              aulaId: params.aulaId,
              discenteId: savedDiscente.id,
              cantiere: rowData.cantiere || undefined,
              sottocantiere: rowData.sottocantiere || undefined,
              responsabile: rowData.responsabile || undefined,
            },
          });
          aggiunti++;
        }

        return { status: 200 as const, body: { success: true, aggiunti, totale: validationResult.valid.length } };
      },
      { timeout: 30000 }
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Import discenti aula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
