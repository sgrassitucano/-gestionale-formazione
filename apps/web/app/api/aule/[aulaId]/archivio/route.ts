import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { uploadFile, BUCKETS } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const archivio = await withUserContext(user, (tx) =>
    tx.archivioAula.findMany({
      where: { aulaId: params.aulaId, deletedAt: null },
      orderBy: { dataUpload: "desc" },
    })
  );

  return NextResponse.json({ success: true, archivio });
}

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
    const tipoDocumento = formData.get("tipoDocumento") as string;

    if (!file || !tipoDocumento) {
      return NextResponse.json({ error: "File and tipoDocumento required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${params.aulaId}/${Date.now()}_${file.name}`;

    const fileUrl = await uploadFile(BUCKETS.ARCHIVIO, path, buffer, file.type);

    const entry = await withUserContext(user, (tx) =>
      tx.archivioAula.create({
        data: {
          aulaId: params.aulaId,
          tipoDocumento,
          fileUrl,
          mimeType: file.type,
          uploadDay: user.id,
        },
      })
    );

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("Upload archivio error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
