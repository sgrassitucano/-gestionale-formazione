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

// Firme strutturali per riconoscere un record cifrato ovunque compaia nel
// risultato — anche annidato dentro un `include` di un altro modello (Prisma
// $use vede solo il modello radice della query: params.model non aiuta a
// sapere se `result.iscrizioni[].discente` è un Discente). Basta guardare le
// chiavi presenti: solo Discente ha sia cognome che codiceFiscale insieme,
// solo ProfiloUtente ha sia email che passwordHash insieme.
const FIRME_MODELLO: Array<{ model: string; richiedeChiavi: string[] }> = [
  { model: "Discente", richiedeChiavi: ["cognome", "codiceFiscale"] },
  { model: "ProfiloUtente", richiedeChiavi: ["email", "passwordHash"] },
];

function riconosciModello(obj: Record<string, any>): string | null {
  for (const { model, richiedeChiavi } of FIRME_MODELLO) {
    if (richiedeChiavi.every((k) => k in obj)) return model;
  }
  return null;
}

function decifraOggetto(model: string, obj: Record<string, any>): void {
  const campi = CAMPI_CIFRATI[model];
  if (!campi) return;
  for (const { campo } of campi) {
    if (campo in obj) obj[campo] = decifraValore(campo, obj[campo]);
  }
}

/**
 * Attraversa ricorsivamente qualunque risultato Prisma (root + relazioni
 * incluse a qualunque profondità) e decifra ogni oggetto la cui forma
 * corrisponde a un modello cifrato, indipendentemente da dove compare
 * nell'albero (root, dentro un array, dentro un `include` annidato).
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

  const modelloRiconosciuto = riconosciModello(valore);
  if (modelloRiconosciuto) decifraOggetto(modelloRiconosciuto, valore);

  for (const key of Object.keys(valore)) {
    const v = valore[key];
    if (v && typeof v === "object") decifraProfondo(v, visti);
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
