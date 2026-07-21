import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { decrypt } from "@gestionale/utils/encryption";
import { BACKUP_MODEL_ORDER, chiavePrimaria, toCamelCase, type BackupPayload } from "@/lib/backup";

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "file richiesto" }, { status: 400 });

    const cifrato = await file.text();
    let payload: BackupPayload;
    try {
      payload = JSON.parse(decrypt(cifrato));
    } catch {
      return NextResponse.json(
        { error: "File non valido o cifrato con una chiave diversa (ENCRYPTION_KEY non corrispondente)" },
        { status: 400 }
      );
    }

    if (payload.version !== 1 || !payload.tables) {
      return NextResponse.json({ error: "Formato backup non riconosciuto" }, { status: 400 });
    }

    // Ripristino = UNISCI, mai sostituzione: crea le righe mancanti,
    // SALTA quelle già esistenti (non aggiorna, non cancella mai nulla) —
    // nell'ordine genitori->figli per rispettare le FK. Lo skip invece
    // dell'update è anche necessario per tabelle append-only come LogAudit
    // (nessuna policy RLS di UPDATE su quella tabella, per design: un
    // upsert con conflitto su una riga esistente veniva rifiutato dal DB
    // con "row-level security policy violation" — verificato).
    const risultati: Record<string, { creati: number; saltati: number; errori: number }> = {};
    let righeTotali = 0;

    await withUserContext(
      user,
      async (tx) => {
      for (const model of BACKUP_MODEL_ORDER) {
        const rows: any[] = payload.tables[model] ?? [];
        const pk = chiavePrimaria(model);
        const camel = toCamelCase(model);
        let creati = 0;
        let saltati = 0;
        let errori = 0;

        for (const row of rows) {
          const pkValue = row[pk];
          if (pkValue === undefined) {
            errori++;
            continue;
          }
          try {
            const esisteva = await (tx as any)[camel].findUnique({ where: { [pk]: pkValue } });
            if (esisteva) {
              saltati++;
              continue;
            }
            await (tx as any)[camel].create({ data: row });
            creati++;
          } catch (err) {
            console.error(`Backup import: errore su ${model}/${pkValue}:`, err);
            errori++;
          }
        }

        risultati[model] = { creati, saltati, errori };
        righeTotali += rows.length;
      }

      await tx.backupLog.create({
        data: { tipo: "IMPORT", utenteId: user.id, righeTotali, dimensioneByte: Buffer.byteLength(cifrato, "utf-8") },
      });

      await tx.logAudit.create({
        data: {
          utenteId: user.id,
          azione: "RIPRISTINO_BACKUP",
          tabella: null,
          recordId: null,
          dettagli: { righeTotali, risultati, backupEsportatoIl: payload.exportedAt },
        },
      });
      },
      { timeout: 60000 }
    );

    return NextResponse.json({ success: true, righeTotali, risultati });
  } catch (error) {
    console.error("Backup import error:", error);
    return NextResponse.json({ error: "Errore durante il ripristino" }, { status: 500 });
  }
}
