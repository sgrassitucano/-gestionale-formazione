import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { withUserContext } from "@gestionale/db/context";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ success: true, docenti: [] });

  const docenti = await withUserContext(user, (tx) =>
    tx.docente.findMany({
      where: {
        deletedAt: null,
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { cognome: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        docentilezioni: {
          where: { deletedAt: null },
          include: { aula: { include: { corso: true, luogo: true } } },
          orderBy: { aula: { dataInizio: "desc" } },
        },
      },
      take: 30,
    })
  );

  return NextResponse.json({ success: true, docenti });
}
