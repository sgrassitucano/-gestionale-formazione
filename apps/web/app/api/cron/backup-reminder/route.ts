// Cron giornaliero (Vercel Cron, vedi vercel.json) — controlla se l'ultimo
// backup dati (BackupLog tipo EXPORT) risale a più di GIORNI_SCADENZA_BACKUP
// giorni fa. Nessun canale email/Slack nel sistema: il "promemoria" è una
// riga di LogAudit (visibile in Audit Log) più il banner live nella pagina
// admin/backup, che calcola la stessa scadenza a ogni visita — questo cron
// serve solo a lasciare una traccia storica di quando il backup era scaduto,
// non è l'unico meccanismo di avviso (il banner funziona anche senza cron).

import { NextRequest, NextResponse } from "next/server";
import { withServiceContext } from "@gestionale/db/context";
import { GIORNI_SCADENZA_BACKUP } from "@/lib/backup";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await withServiceContext(async (tx) => {
    const ultimo = await tx.backupLog.findFirst({
      where: { tipo: "EXPORT" },
      orderBy: { createdAt: "desc" },
    });

    const giorniTrascorsi = ultimo ? Math.floor((Date.now() - ultimo.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const scaduto = giorniTrascorsi === null || giorniTrascorsi > GIORNI_SCADENZA_BACKUP;

    if (scaduto) {
      const superadmin = await tx.profiloUtente.findFirst({ where: { ruolo: "SUPERADMIN", deletedAt: null } });
      if (superadmin) {
        await tx.logAudit.create({
          data: {
            utenteId: superadmin.id,
            azione: "BACKUP_SCADUTO",
            tabella: "BackupLog",
            recordId: null,
            dettagli: { giorniTrascorsi, sogliaGiorni: GIORNI_SCADENZA_BACKUP },
          },
        });
      }
    }

    return { scaduto, giorniTrascorsi };
  });

  return NextResponse.json({ success: true, ...result });
}
