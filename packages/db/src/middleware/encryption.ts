import { Prisma } from "@prisma/client";
import { encrypt, decrypt, blindIndex } from "@gestionale/utils/encryption";

// Campi cifrati per modello. Ogni campo con blindIndexField ha anche una
// colonna hash separata per permettere lookup esatti (where: {campo: "x"})
// senza dover decifrare tutta la tabella — vedi packages/utils/src/encryption.ts.
const CAMPI_CIFRATI: Record<string, Array<{ campo: string; blindIndexField?: string }>> = {
  ProfiloUtente: [{ campo: "email", blindIndexField: "emailHash" }],
  Discente: [
    { campo: "cognome" },
    { campo: "nome" },
    { campo: "dataNascita" }, // serializzata come ISO string prima di cifrare
    { campo: "codiceFiscale", blindIndexField: "codiceFiscaleHash" },
    { campo: "email" },
    { campo: "cellulare" },
  ],
};

function cifraValore(campo: string, valore: any): string | null {
  if (valore === null || valore === undefined) return null;

  // Idempotenza: se valore è già ciphertext valido per questa chiave, non
  // ricifrarlo. Bug reale trovato (2026-07-21): cifraDataInput muta `data`
  // IN PLACE. Prisma, quando un upsert incontra un conflitto di unicità
  // (es. codiceFiscaleHash già esistente), a volte ritenta l'operazione
  // internamente riusando lo STESSO oggetto args già mutato dal primo
  // tentativo — il middleware si ritrovava a "cifrare" un valore già
  // cifrato. Su dataNascita questo crashava rumorosamente (new Date(
  // ciphertext).toISOString() → RangeError). Su cognome/nome/email/
  // cellulare NON avrebbe generato alcun errore: avrebbe cifrato due volte
  // silenziosamente, corrompendo il dato in modo invisibile (al momento
  // della decifratura si sarebbe ottenuto il ciphertext interno invece del
  // plaintext). Questo guard previene entrambi i casi.
  if (typeof valore === "string") {
    try {
      decrypt(valore);
      return valore; // già cifrato, nessuna azione
    } catch {
      // non è ciphertext valido, procede a cifrarlo normalmente
    }
  }

  const testo = campo === "dataNascita" ? new Date(valore).toISOString() : String(valore);
  return encrypt(testo);
}

function decifraValore(campo: string, valore: any): any {
  if (valore === null || valore === undefined || typeof valore !== "string") return valore;
  try {
    const testo = decrypt(valore);
    return campo === "dataNascita" ? new Date(testo) : testo;
  } catch {
    // Valore non cifrato (dato legacy pre-migrazione, o già in chiaro): lo
    // restituiamo così com'è invece di far esplodere la richiesta.
    return valore;
  }
}

function cifraDataInput(model: string, data: Record<string, any>): void {
  const campi = CAMPI_CIFRATI[model];
  if (!campi || !data) return;

  for (const { campo, blindIndexField } of campi) {
    if (!(campo in data)) continue;
    const valoreOriginale = data[campo];

    if (blindIndexField && valoreOriginale !== null && valoreOriginale !== undefined) {
      data[blindIndexField] = blindIndex(String(valoreOriginale));
    }

    const cifrato = cifraValore(campo, valoreOriginale);
    if (cifrato !== null) data[campo] = cifrato;
  }
}

// Insieme piatto di tutti i nomi di campo cifrati, unione su tutti i
// modelli (es. "email" copre sia ProfiloUtente.email che Discente.email).
// Usato per decifrare per NOME DI CAMPO invece che per "modello
// riconosciuto": un tentativo precedente riconosceva il modello da una
// firma di chiavi obbligatorie (es. ProfiloUtente = ha sia "email" che
// "passwordHash"), ma qualunque `select` che escludesse anche solo una
// chiave della firma (es. `select: { email, nome, cognome }` in
// audit/logs/route.ts, senza passwordHash) faceva fallire il
// riconoscimento e l'email restava in chiaro — bug reale, verificato.
// Sicuro anche se il nome campo collide con un campo NON cifrato di un
// altro modello (es. Docente.nome/cognome/email sono in chiaro): decrypt()
// usa AEAD (nacl.secretbox), fallisce sempre su testo non cifrato, e
// decifraValore già cattura l'eccezione restituendo il valore originale.
const CAMPI_CIFRATI_NOMI = new Set(
  Object.values(CAMPI_CIFRATI).flatMap((campi) => campi.map((c) => c.campo))
);

/**
 * Attraversa ricorsivamente qualunque risultato Prisma (root + relazioni
 * incluse a qualunque profondità, qualunque combinazione di `select`) e
 * decifra ogni campo il cui nome corrisponde a un campo cifrato noto,
 * indipendentemente da dove compare nell'albero o da quali altri campi
 * sono stati selezionati insieme.
 */
function decifraProfondo(valore: any, visti = new WeakSet<object>()): any {
  if (valore === null || typeof valore !== "object") return valore;
  if (visti.has(valore)) return valore; // evita loop su riferimenti circolari
  visti.add(valore);

  if (Array.isArray(valore)) {
    for (const item of valore) decifraProfondo(item, visti);
    return valore;
  }

  if (valore instanceof Date) return valore;

  for (const key of Object.keys(valore)) {
    const v = valore[key];
    if (CAMPI_CIFRATI_NOMI.has(key)) {
      valore[key] = decifraValore(key, v);
    } else if (v && typeof v === "object") {
      decifraProfondo(v, visti);
    }
  }

  return valore;
}

/**
 * Riscrive un `where` che filtra per uguaglianza esatta su un campo cifrato
 * (es. { email: "x@y.it" }) sostituendolo con il lookup sul blind index
 * (es. { emailHash: blindIndex("x@y.it") }). Non supporta `contains`/ricerche
 * parziali su campi cifrati — limite intrinseco: un HMAC deterministico
 * indicizza solo l'uguaglianza esatta, mai le sottostringhe.
 */
function riscriviWhere(model: string, where: any): void {
  const campi = CAMPI_CIFRATI[model];
  if (!campi || !where || typeof where !== "object") return;

  for (const { campo, blindIndexField } of campi) {
    if (!blindIndexField) continue;
    if (campo in where) {
      const valore = where[campo];
      if (typeof valore === "string") {
        where[blindIndexField] = blindIndex(valore);
        delete where[campo];
      }
      // where[campo] non è una stringa semplice (es. { contains: ... }):
      // non riscrivibile su un campo cifrato, lasciato invariato — la query
      // fallirà o non troverà nulla, meglio di un match silenziosamente sbagliato.
    }
  }
}

export const encryptionMiddleware: Prisma.Middleware = async (params, next) => {
  const model = params.model;

  if (model && CAMPI_CIFRATI[model]) {
    if (params.action === "create" && params.args?.data) {
      cifraDataInput(model, params.args.data);
    }
    if (params.action === "update" && params.args?.data) {
      cifraDataInput(model, params.args.data);
    }
    if (params.action === "createMany" && params.args?.data) {
      for (const d of params.args.data) cifraDataInput(model, d);
    }
    if (params.action === "upsert") {
      if (params.args?.create) cifraDataInput(model, params.args.create);
      if (params.args?.update) cifraDataInput(model, params.args.update);
    }
    if (params.args?.where) {
      riscriviWhere(model, params.args.where);
    }
  }

  const result = await next(params);

  // Sempre, non solo se il modello radice è cifrato: il risultato può
  // contenere relazioni incluse (discente/utente annidati) che vanno
  // decifrate a prescindere da quale modello è stato interrogato.
  return decifraProfondo(result);
};
