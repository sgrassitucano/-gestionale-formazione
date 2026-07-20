import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { uploadFile, BUCKETS } from "@/lib/storage";
import { leggiDocumento } from "@gestionale/utils/documento-reader";
import { trovaDiscenteMatch, type DiscenteCandidato, livelloConfidenza } from "@gestionale/utils/discente-matcher";

// Tipi documento che sono "a livello aula" (un solo file, nessun discente da matchare)
const TIPI_AULA_LEVEL = new Set([
  "REGISTRO",
  "RESOCONTO",
  "GRADIMENTO", // Presenza: PDF cumulativo unico
  "FASCICOLO_STATICO",
  "EBAFOS",
  "PIATTAFORMA",
  "LISTA_CORSISTI",
  "AUTODICHIARAZIONE",
  "REPORT_QUESTIONARIO",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aula = await withUserContext(user, (tx) =>
    tx.aula.findUnique({
      where: { id: params.aulaId },
      include: { iscrizioni: { include: { discente: true } } },
    })
  );
  if (!aula) return NextResponse.json({ error: "Aula non trovata" }, { status: 404 });

  const candidati: DiscenteCandidato[] = aula.iscrizioni.map((i) => ({
    id: i.discente.id,
    cognome: i.discente.cognome,
    nome: i.discente.nome,
    codiceFiscale: i.discente.codiceFiscale,
  }));

  const formData = await request.formData();
  const tipoDocumento = formData.get("tipoDocumento") as string;
  const files = formData.getAll("files") as File[];

  if (!tipoDocumento || files.length === 0) {
    return NextResponse.json({ error: "tipoDocumento e files richiesti" }, { status: 400 });
  }

  const aulaLevel = TIPI_AULA_LEVEL.has(tipoDocumento);

  const risultati = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${params.aulaId}/staging/${Date.now()}_${file.name}`;
    const fileUrl = await uploadFile(BUCKETS.ARCHIVIO, path, buffer, file.type);

    if (aulaLevel) {
      risultati.push({
        fileName: file.name,
        fileUrl,
        mimeType: file.type,
        tipoDocumento,
        discenteMatch: null,
        metodoLettura: null,
        livelloConfidenza: null,
      });
      continue;
    }

    const pagine = await leggiDocumento(buffer);
    const testoCompleto = pagine.map((p) => p.testo).join(" ");
    const match = trovaDiscenteMatch(testoCompleto, candidati);

    risultati.push({
      fileName: file.name,
      fileUrl,
      mimeType: file.type,
      tipoDocumento,
      discenteMatch: match,
      metodoLettura: pagine[0]?.metodo ?? null,
      livelloConfidenza: match ? livelloConfidenza(match.confidenza) : null,
    });
  }

  return NextResponse.json({ success: true, risultati, candidati });
}
