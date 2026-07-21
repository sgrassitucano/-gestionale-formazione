import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { GIORNI_SCADENZA_BACKUP } from "@/lib/backup";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ultimo = await withUserContext(user, (tx) =>
    tx.backupLog.findFirst({
      where: { tipo: "EXPORT" },
      orderBy: { createdAt: "desc" },
      include: { utente: { select: { nome: true, cognome: true } } },
    })
  );

  const giorniTrascorsi = ultimo ? Math.floor((Date.now() - ultimo.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const scaduto = giorniTrascorsi === null || giorniTrascorsi > GIORNI_SCADENZA_BACKUP;

  return NextResponse.json({
    success: true,
    ultimoBackup: ultimo
      ? {
          data: ultimo.createdAt,
          utente: `${ultimo.utente.nome ?? ""} ${ultimo.utente.cognome ?? ""}`.trim(),
          righeTotali: ultimo.righeTotali,
          dimensioneByte: ultimo.dimensioneByte,
        }
      : null,
    giorniTrascorsi,
    scaduto,
    sogliaGiorni: GIORNI_SCADENZA_BACKUP,
  });
}
