import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const aula = await db.aula.findUnique({
    where: { id: params.aulaId },
    include: {
      corso: true,
      luogo: true,
      lezioni: { where: { deletedAt: null }, orderBy: { data: "asc" } },
      iscrizioni: { where: { deletedAt: null }, include: { discente: true } },
      docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
      archivio: { where: { deletedAt: null } },
    },
  });

  if (!aula || aula.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, aula });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowedFields = ["luogoId", "stato", "dataInizio", "dataFine"];
    const data: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = key.includes("data") && body[key] ? new Date(body[key]) : body[key];
      }
    }

    const aula = await db.aula.update({ where: { id: params.aulaId }, data });

    return NextResponse.json({ success: true, aula });
  } catch (error) {
    console.error("Update aula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
