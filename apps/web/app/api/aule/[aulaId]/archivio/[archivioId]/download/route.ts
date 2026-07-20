import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { downloadFile, pathFromFileUrl, BUCKETS } from "@/lib/storage";

// Proxy di download: il bucket "archivio" è privato, il file non è mai
// raggiungibile direttamente col fileUrl salvato in DB. Questo endpoint
// scarica lato server (service role) e streamma al browser, con auth
// verificata dal nostro middleware/sessione invece che dall'URL stesso.
export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string; archivioId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await withUserContext(user, (tx) =>
    tx.archivioAula.findFirst({
      where: { id: params.archivioId, aulaId: params.aulaId, deletedAt: null },
    })
  );
  if (!doc) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });

  const path = pathFromFileUrl(BUCKETS.ARCHIVIO, doc.fileUrl);
  if (!path) return NextResponse.json({ error: "Path file non valido" }, { status: 500 });

  const buffer = await downloadFile(BUCKETS.ARCHIVIO, path);
  const nomeFile = path.split("/").pop() || `${doc.tipoDocumento}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${nomeFile}"`,
    },
  });
}
