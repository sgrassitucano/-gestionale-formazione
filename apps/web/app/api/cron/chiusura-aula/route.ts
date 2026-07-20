// Cron giornaliero (Vercel Cron, vedi vercel.json) — cancella i file caricati
// in fase di chiusura aula per le aule il cui countdown di 7 giorni è scaduto.
// I record ArchivioAula restano (soft-delete, retention audit), il file
// fisico su Storage viene rimosso davvero.

import { NextRequest, NextResponse } from "next/server";
import { withServiceContext } from "@gestionale/db/context";
import { deleteFile, pathFromFileUrl, BUCKETS } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const risultati = await withServiceContext(async (tx) => {
    const aulaScadute = await tx.chiusuraAula.findMany({
      where: {
        fase: "COUNTDOWN",
        dataEliminazionePrevista: { lte: new Date() },
      },
    });

    const risultati = [];
    for (const chiusura of aulaScadute) {
      const documenti = await tx.archivioAula.findMany({
        where: { aulaId: chiusura.aulaId, deletedAt: null },
      });

      let eliminati = 0;
      for (const doc of documenti) {
        try {
          const path = pathFromFileUrl(BUCKETS.ARCHIVIO, doc.fileUrl);
          if (path) await deleteFile(BUCKETS.ARCHIVIO, path);
          await tx.archivioAula.update({
            where: { id: doc.id },
            data: { deletedAt: new Date() },
          });
          eliminati++;
        } catch (err) {
          console.error(`Errore eliminazione file archivio ${doc.id}:`, err);
        }
      }

      await tx.chiusuraAula.update({
        where: { id: chiusura.id },
        data: { fase: "COMPLETATA" },
      });

      // LogAudit.utenteId è FK obbligatoria verso ProfiloUtente: scriviamo l'audit
      // solo se abbiamo un utente reale (chi aveva confermato gli attestati);
      // altrimenti il cron logga solo su console (nessun utente "di sistema" in schema).
      if (chiusura.confermatoDay) {
        await tx.logAudit.create({
          data: {
            utenteId: chiusura.confermatoDay,
            azione: "CRON_CANCELLAZIONE_ARCHIVIO_CHIUSURA_AULA",
            tabella: "ChiusuraAula",
            recordId: chiusura.aulaId,
            dettagli: { documentiEliminati: eliminati, totaleDocumenti: documenti.length },
          },
        });
      } else {
        console.log(`Cron chiusura aula ${chiusura.aulaId}: ${eliminati} documenti eliminati (nessun confermatoDay, audit non scritto)`);
      }

      risultati.push({ aulaId: chiusura.aulaId, documentiEliminati: eliminati });
    }

    return risultati;
  });

  return NextResponse.json({ success: true, aulaProcessate: risultati.length, risultati });
}
