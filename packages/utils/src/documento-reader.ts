// Lettura unificata di un documento caricato in chiusura aula: prova prima
// l'estrazione testo nativo (PDF digitali, es. export piattaforma e-learning);
// se il PDF non ha testo estraibile (scansione cartacea, caso Presenza),
// rasterizza le pagine e le passa a Tesseract OCR. Il chiamante riceve
// sempre lo stesso risultato — non deve sapere quale motore è stato usato.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import path from "path";

// Necessario perché pdfjs renda correttamente testo vettoriale che usa i 14
// font PDF standard (Helvetica, ecc.) senza font incorporato nel file — senza
// questo la pagina rasterizzata risulta con il testo completamente invisibile
// (verificato: bug reale, non solo teorico). Gli scan cartacei veri (immagine
// pura) non ne hanno bisogno, ma costa nulla ed evita pagine vuote silenziose
// per qualunque PDF misto (testo vettoriale + immagine).
const STANDARD_FONT_DATA_URL =
  path.join(require.resolve("pdfjs-dist/package.json"), "..", "standard_fonts") + path.sep;

export type MetodoLettura = "NATIVO" | "OCR";

export interface PaginaLetta {
  indice: number; // 0-based
  testo: string;
  metodo: MetodoLettura;
  confidenza: number | null; // 0-1, solo per OCR (Tesseract mean confidence / 100)
}

// Soglia minima di caratteri "veri" per pagina sotto la quale consideriamo il
// PDF privo di testo nativo (scansione pura, magari con qualche artefatto OCR
// già embeddato dallo scanner ma non affidabile).
const SOGLIA_CARATTERI_NATIVI = 20;

/**
 * Legge tutte le pagine di un PDF, scegliendo in automatico testo nativo o OCR.
 * La decisione è presa per l'intero documento (non pagina per pagina): se la
 * maggioranza delle pagine ha testo nativo sufficiente, si fida di quello;
 * altrimenti passa tutto il documento a OCR (evita di mischiare i due metodi
 * su un singolo file, che complicherebbe l'audit).
 */
export async function leggiDocumento(pdfBuffer: Buffer): Promise<PaginaLetta[]> {
  const testoNativoPerPagina = await estraiTestoNativoPerPagina(pdfBuffer);

  const paginheConTestoSufficiente = testoNativoPerPagina.filter(
    (t) => t.replace(/\s+/g, "").length >= SOGLIA_CARATTERI_NATIVI
  ).length;

  const usaTestoNativo =
    testoNativoPerPagina.length > 0 &&
    paginheConTestoSufficiente / testoNativoPerPagina.length >= 0.5;

  if (usaTestoNativo) {
    return testoNativoPerPagina.map((testo, indice) => ({
      indice,
      testo,
      metodo: "NATIVO" as const,
      confidenza: null,
    }));
  }

  return ocrDocumento(pdfBuffer);
}

async function estraiTestoNativoPerPagina(pdfBuffer: Buffer): Promise<string[]> {
  const testoPerPagina: string[] = [];
  await pdfParse(pdfBuffer, {
    pagerender: async (pageData: any) => {
      const textContent = await pageData.getTextContent();
      const testo = textContent.items.map((item: any) => item.str).join(" ");
      testoPerPagina.push(testo);
      return testo;
    },
  });
  return testoPerPagina;
}

async function ocrDocumento(pdfBuffer: Buffer): Promise<PaginaLetta[]> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
  const worker = await createWorker("ita");
  const risultato: PaginaLetta[] = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const pagina = await doc.getPage(i);
      const viewport = pagina.getViewport({ scale: 2.0 }); // scala 2x per leggibilità OCR
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");

      await pagina.render({ canvasContext: ctx as any, viewport }).promise;
      const imageBuffer = canvas.toBuffer("image/png");

      const { data } = await worker.recognize(imageBuffer);
      risultato.push({
        indice: i - 1,
        testo: data.text,
        metodo: "OCR",
        confidenza: data.confidence != null ? data.confidence / 100 : null,
      });
    }
  } finally {
    await worker.terminate();
  }

  return risultato;
}
