// Splitta il PDF "Esiti dei test di valutazione e dell'esame finale" scaricato dalla
// piattaforma Discentya (un unico PDF per discente, con tutte le sezioni mischiate)
// in 3 PDF separati: test intermedi, esame finale, quiz di gradimento.
// Il testo è nativo (nessuna scansione), quindi non serve OCR: si riconoscono le
// sezioni dagli header di ogni pagina e si estrae il CF per il matching col discente.

import { PDFDocument } from "pdf-lib";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");

export type SezioneEsito = "INTERMEDI" | "FINALE" | "GRADIMENTO";

export interface PaginaClassificata {
  indice: number; // 0-based, indice pagina nel PDF originale
  sezione: SezioneEsito;
  testo: string;
}

export interface EsitiSplitResult {
  codiceFiscale: string | null;
  intermedi: Uint8Array | null;
  finale: Uint8Array | null;
  gradimento: Uint8Array | null;
}

const RE_CF = /Codice fiscale:\s*\(?([A-Z0-9]{16})\)?/i;

/**
 * Analizza un PDF di esiti (nativo, testo estraibile) pagina per pagina e
 * restituisce la sezione di appartenenza di ciascuna, propagando l'ultima
 * intestazione riconosciuta alle pagine di continuazione (che non ripetono
 * l'header "Esiti del test..." su ogni pagina).
 */
export async function classificaPagineEsiti(pdfBuffer: Buffer): Promise<PaginaClassificata[]> {
  const testoPerPagina: string[] = [];

  await pdfParse(pdfBuffer, {
    // Un solo passaggio di parsing: il callback viene invocato una volta per
    // pagina, nell'ordine in cui compaiono nel documento.
    pagerender: async (pageData: any) => {
      const textContent = await pageData.getTextContent();
      const testo = textContent.items.map((item: any) => item.str).join(" ");
      testoPerPagina.push(testo);
      return testo;
    },
  });

  const risultato: PaginaClassificata[] = [];
  let sezioneCorrente: SezioneEsito = "INTERMEDI";

  testoPerPagina.forEach((testoPagina, indice) => {
    // Un header di nuova sezione compare solo sulla prima pagina di quella sezione;
    // le pagine di continuazione ereditano la sezione corrente.
    if (/Esiti dell'esame finale/i.test(testoPagina)) {
      sezioneCorrente = "FINALE";
    } else if (/Quiz di gradimento/i.test(testoPagina)) {
      sezioneCorrente = "GRADIMENTO";
    } else if (/Esiti del test di valutazione/i.test(testoPagina)) {
      sezioneCorrente = "INTERMEDI";
    }

    risultato.push({ indice, sezione: sezioneCorrente, testo: testoPagina });
  });

  return risultato;
}

/**
 * Estrae il codice fiscale del discente dal testo nativo del PDF (compare su
 * ogni pagina come "Codice fiscale: XXXXXXXXXXXXXXXX").
 */
export function estraiCodiceFiscale(testoPagina: string): string | null {
  const match = testoPagina.match(RE_CF);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Splitta il PDF originale nei 3 sotto-documenti per sezione, copiando le
 * pagine corrispondenti con pdf-lib (nessuna rasterizzazione, resta testo nativo).
 */
export async function splitEsitiPdf(pdfBuffer: Buffer): Promise<EsitiSplitResult> {
  const pagine = await classificaPagineEsiti(pdfBuffer);
  const codiceFiscale = pagine.map((p) => estraiCodiceFiscale(p.testo)).find((cf) => cf) ?? null;

  const sorgente = await PDFDocument.load(pdfBuffer);

  const gruppi: Record<SezioneEsito, number[]> = { INTERMEDI: [], FINALE: [], GRADIMENTO: [] };
  for (const p of pagine) gruppi[p.sezione].push(p.indice);

  async function estraiGruppo(indici: number[]): Promise<Uint8Array | null> {
    if (indici.length === 0) return null;
    const doc = await PDFDocument.create();
    const pagineCopiate = await doc.copyPages(sorgente, indici);
    pagineCopiate.forEach((pagina) => doc.addPage(pagina));
    return doc.save();
  }

  return {
    codiceFiscale,
    intermedi: await estraiGruppo(gruppi.INTERMEDI),
    finale: await estraiGruppo(gruppi.FINALE),
    gradimento: await estraiGruppo(gruppi.GRADIMENTO),
  };
}
