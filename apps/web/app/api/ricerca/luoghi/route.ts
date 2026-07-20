import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { withUserContext } from "@gestionale/db/context";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ success: true, luoghi: [] });

  const luoghi = await withUserContext(user, (tx) =>
    tx.luogo.findMany({
      where: {
        deletedAt: null,
        nome: { contains: q, mode: "insensitive" },
      },
      include: {
        aule: {
          where: { deletedAt: null },
          include: {
            corso: true,
            iscrizioni: { where: { deletedAt: null } },
            docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
          },
          orderBy: { dataInizio: "desc" },
        },
      },
      take: 30,
    })
  );

  return NextResponse.json({ success: true, luoghi });
}
