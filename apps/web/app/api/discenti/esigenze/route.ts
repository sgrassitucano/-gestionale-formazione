import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Discenti with no active (non-deleted) iscrizione
  const discenti = await db.discente.findMany({
    where: {
      deletedAt: null,
      iscrizioni: { none: { deletedAt: null } },
    },
    include: { azienda: true },
    orderBy: { cognome: "asc" },
  });

  return NextResponse.json({ success: true, discenti });
}
