import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user || user.ruolo !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const utenteId = searchParams.get("utenteId");
    const azione = searchParams.get("azione");

    const where: any = {};
    if (utenteId) where.utenteId = utenteId;
    if (azione) where.azione = { contains: azione };

    const [logs, total] = await withUserContext(user, (tx) =>
      Promise.all([
        tx.logAudit.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            utente: {
              select: {
                email: true,
                nome: true,
                cognome: true,
              },
            },
          },
        }),
        tx.logAudit.count({ where }),
      ])
    );

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
