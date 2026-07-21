import { db } from "./client";
import type { Prisma } from "@prisma/client";

export interface DbUserContext {
  id: string;
  ruolo: string;
}

/**
 * Esegue `callback` dentro una transazione con il contesto utente settato
 * come variabile di sessione Postgres (`app.user_id` / `app.user_role`),
 * letta dalle policy RLS (vedi migration `rls_policies`). Necessario perché
 * l'app usa un JWT proprio (non Supabase Auth): Postgres non ha altrimenti
 * modo di sapere "chi" sta eseguendo la query quando Prisma si connette con
 * service role. `SET LOCAL` vale solo per la transazione corrente — sicuro
 * anche con connection pooling in modalità transazione (PgBouncer).
 */
export async function withUserContext<T>(
  user: DbUserContext,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  // Default Prisma: 5000ms. Non basta per operazioni che leggono/scrivono
  // molte tabelle in sequenza nella stessa transazione (es. export/import
  // backup, ~23 tabelle) — verificato: l'export falliva con "Transaction
  // already closed" al timeout di default.
  options?: { timeout?: number }
): Promise<T> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.user_id = '${escapeSqlLiteral(user.id)}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.user_role = '${escapeSqlLiteral(user.ruolo)}'`);
      return callback(tx);
    },
    options?.timeout ? { timeout: options.timeout } : undefined
  );
}

/**
 * Come withUserContext, ma per operazioni pre-auth dove non esiste ancora un
 * utente (login, creazione utente, lookup per email/id durante verifica
 * sessione). Imposta app.user_role = SUPERADMIN così le policy RLS su
 * ProfiloUtente non bloccano la query. Sicuro: chiamato solo da codice
 * server interno (lib/auth.ts), mai da input utente diretto.
 */
export async function withServiceContext<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.user_role = 'SUPERADMIN'`);
    return callback(tx);
  });
}

function escapeSqlLiteral(value: string): string {
  // SET LOCAL non supporta i parametri bind di Postgres per il valore in
  // questa forma: id/ruolo qui provengono sempre dal JWT verificato (mai da
  // input utente diretto), ma raddoppiamo comunque gli apici per sicurezza.
  return value.replace(/'/g, "''");
}
