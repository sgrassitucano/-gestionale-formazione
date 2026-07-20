import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { downloadFile, pathFromFileUrl, BUCKETS } from "@/lib/storage";
import { costruisciZipChiusuraAula, type Modalita, type DocumentoZip } from "@gestionale/utils/zip-assembler";
import { leggiDocumento } from "@gestionale/utils/documento-reader";
import { parseGradimento, generateReportQuestionarioXlsx, type GradimentoDiscente } from "@gestionale/utils/questionario-gradimento";

export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const aula = await withUserContext(user, (tx) =>
    tx.aula.findUnique({
      where: { id: params.aulaId },
      include: {
        corso: true,
        archivio: { where: { deletedAt: null }, include: { discente: true } },
      },
    })
  );

  if (!aula) return NextResponse.json({ error: "Aula non trovata" }, { status: 404 });
  if (aula.archivio.length === 0) {
    return NextResponse.json({ error: "Nessun documento archiviato per questa aula" }, { status: 400 });
  }

  const documenti: DocumentoZip[] = [];
  const gradimentoPerDiscente: GradimentoDiscente[] = [];
  let haGradimentoDiscente = false;

  for (const doc of aula.archivio) {
    // Il Report Questionario viene ricalcolato dal gradimento per-discente
    // (vedi sotto): eventuali upload manuali di REPORT_QUESTIONARIO vengono
    // ignorati per evitare un duplicato/incoerente nella stessa cartella.
    if (doc.tipoDocumento === "REPORT_QUESTIONARIO" && aula.archivio.some((d) => d.tipoDocumento === "TEST_GRADIMENTO")) {
      continue;
    }

    const path = pathFromFileUrl(BUCKETS.ARCHIVIO, doc.fileUrl);
    if (!path) continue;
    try {
      const buffer = await downloadFile(BUCKETS.ARCHIVIO, path);
      documenti.push({
        tipoDocumento: doc.tipoDocumento,
        discente: doc.discente ? { cognome: doc.discente.cognome, nome: doc.discente.nome } : null,
        fileBuffer: buffer,
        fileUrl: doc.fileUrl,
      });

      if (doc.tipoDocumento === "TEST_GRADIMENTO" && doc.discente) {
        haGradimentoDiscente = true;
        const pagine = await leggiDocumento(buffer);
        const testo = pagine.map((p) => p.testo).join(" ");
        gradimentoPerDiscente.push({
          discente: { cognome: doc.discente.cognome, nome: doc.discente.nome },
          risposte: parseGradimento(testo),
        });
      }
    } catch (err) {
      console.error(`Errore download file archivio ${doc.id}:`, err);
    }
  }

  if (haGradimentoDiscente && gradimentoPerDiscente.length > 0) {
    const reportBuffer = generateReportQuestionarioXlsx(gradimentoPerDiscente);
    documenti.push({
      tipoDocumento: "REPORT_QUESTIONARIO",
      discente: null,
      fileBuffer: reportBuffer,
      fileUrl: "report_questionario_generato.xlsx",
    });
  }

  const dataInizio = aula.dataInizio ? aula.dataInizio.toISOString().slice(0, 10) : "senza-data";
  const nomeCartella = `${aula.corso.titolo}_${aula.id.slice(0, 8)}_${dataInizio}`;

  const zipBuffer = await costruisciZipChiusuraAula(
    aula.modalita as Modalita,
    nomeCartella,
    documenti
  );

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nomeCartella}.zip"`,
    },
  });
}
