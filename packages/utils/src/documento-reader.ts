// Lettura unificata di un documento caricato in chiusura aula: prova prima
// l'estrazione testo nativo (PDF digitali, es. export piattaforma e-learning);
// se il PDF non ha testo estraibile (scansione cartacea, caso Presenza),
// rasterizza le pagine e le passa a Tesseract OCR. Il chiamante riceve
// sempre lo stesso risultato — non deve sapere quale motore è stato usato.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { createWorker, PSM } from "tesseract.js";
import path from "path";

// Necessario perché pdfjs renda correttamente testo vettoriale che usa i 14
// font PDF standard (Helvetica, ecc.) senza font incorporato nel file — senza
// questo la pagina rasterizzata risulta con il testo completamente invisibile
// (verificato: bug reale, non solo teorico). Gli scan cartacei veri (immagine
// pura) non ne hanno bisogno, ma costa nulla ed evita pagine vuote silenziose
// per qualunque PDF misto (testo vettoriale + immagine).
// eval("require") invece di require diretto: senza questo, Next.js sostituisce
// require.resolve con un id numerico di modulo interno al bundle invece del
// path reale su disco (bug verificato: "path" argument must be of type
// string, received type number — crashava "Collecting page data" in build),
// perché webpack analizza staticamente require.resolve anche se il pacchetto
// target è in serverComponentsExternalPackages (quello esclude pdfjs-dist dal
// bundling, non la chiamata require.resolve dentro questo modulo, comunque
// transpilato da webpack in quanto parte di @gestionale/utils). Il commento
// /* webpackIgnore: true */ non è supportato su require.resolve, solo su
// import()/require() diretti — eval nasconde la stringa dall'analisi statica.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const nodeRequire: NodeRequire = eval("require");
const STANDARD_FONT_DATA_URL =
  path.join(nodeRequire.resolve("pdfjs-dist/package.json"), "..", "standard_fonts") + path.sep;

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

// Converte in scala di grigi e binarizza con soglia Otsu (calcolata
// sull'istogramma, adattiva per pagina). Verificato su uno scan cartaceo
// reale (registro presenze): senza preprocessing, Tesseract su una griglia
// fitta con scrittura a mano dava confidenza ~36% e testo illeggibile;
// bordi/righe tabella a bassa opacità confondevano il riconoscimento del
// testo. Binarizzare rimuove le sfumature di grigio (ombre di scansione,
// righe sottili) lasciando solo nero/bianco netto, che Tesseract legge
// molto meglio.
function binarizzaOtsu(canvas: Canvas): void {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const nPixel = width * height;

  const grigi = new Uint8ClampedArray(nPixel);
  const istogramma = new Array(256).fill(0);
  for (let i = 0; i < nPixel; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    grigi[i] = gray;
    istogramma[gray]++;
  }

  // Metodo di Otsu: trova la soglia che massimizza la varianza tra le due
  // classi (pixel testo vs pixel sfondo).
  let sommaTot = 0;
  for (let t = 0; t < 256; t++) sommaTot += t * istogramma[t];

  let sommaB = 0;
  let pesoB = 0;
  let varianzaMax = -1;
  let soglia = 128;

  for (let t = 0; t < 256; t++) {
    pesoB += istogramma[t];
    if (pesoB === 0) continue;
    const pesoF = nPixel - pesoB;
    if (pesoF === 0) break;

    sommaB += t * istogramma[t];
    const mediaB = sommaB / pesoB;
    const mediaF = (sommaTot - sommaB) / pesoF;

    const varianzaTraClassi = pesoB * pesoF * (mediaB - mediaF) ** 2;
    if (varianzaTraClassi > varianzaMax) {
      varianzaMax = varianzaTraClassi;
      soglia = t;
    }
  }

  for (let i = 0; i < nPixel; i++) {
    const v = grigi[i] > soglia ? 255 : 0;
    pixels[i * 4] = v;
    pixels[i * 4 + 1] = v;
    pixels[i * 4 + 2] = v;
  }

  ctx.putImageData(imageData, 0, 0);
}

// Ruota il canvas di 90° in senso orario. Verificato su uno scan cartaceo
// reale (registro presenze Il Tucano): il modulo era stato scansionato in
// orizzontale ma salvato in un PDF con pagina verticale — pdfjs riporta
// /Rotate=0 nel PDF (nessuna rotazione dichiarata nei metadati), ma il
// contenuto raster è fisicamente ruotato di 90°. Nessun metadato da cui
// dedurlo automaticamente: si rileva provando l'OCR sull'orientamento
// originale e, se la confidenza è troppo bassa, ritentando con la rotazione.
function ruota90(canvas: Canvas): Canvas {
  const ruotato = createCanvas(canvas.height, canvas.width);
  const ctx = ruotato.getContext("2d");
  ctx.translate(ruotato.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(canvas as any, 0, 0);
  return ruotato;
}

// Soglia sotto la quale il risultato OCR sull'orientamento originale è
// considerato inaffidabile e si ritenta ruotando di 90° (poi, se ancora
// bassa, si tiene comunque il risultato migliore tra i tentativi provati).
const SOGLIA_CONFIDENZA_OCR_ACCETTABILE = 0.5;

async function ocrDocumento(pdfBuffer: Buffer): Promise<PaginaLetta[]> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
  const worker = await createWorker("ita");
  // PSM.SPARSE_TEXT: il documento è un modulo a griglia fitta (registro
  // presenze), non prosa continua — il PSM automatico di default provava a
  // segmentare la pagina come blocchi di testo/paragrafi e si perdeva nelle
  // linee della tabella. SPARSE_TEXT tratta ogni frammento di testo (celle,
  // firme, numeri) come indipendente, molto più adatto a moduli tabellari.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const risultato: PaginaLetta[] = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const pagina = await doc.getPage(i);
      const viewport = pagina.getViewport({ scale: 3.0 }); // scala 3x, più fine della 2x precedente
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");

      await pagina.render({ canvasContext: ctx as any, viewport }).promise;
      binarizzaOtsu(canvas);

      // Prova l'orientamento originale; se la confidenza è bassa, prova le
      // rotazioni (90/180/270°) e tiene il risultato migliore. La maggior
      // parte dei documenti nativi/scan dritti passa al primo tentativo
      // (nessun costo extra); solo gli scan storti pagano il costo dei
      // tentativi aggiuntivi.
      let migliore = await worker.recognize(canvas.toBuffer("image/png"));
      if ((migliore.data.confidence ?? 0) / 100 < SOGLIA_CONFIDENZA_OCR_ACCETTABILE) {
        let corrente = canvas;
        for (const _ of [1, 2, 3]) {
          corrente = ruota90(corrente);
          const tentativo = await worker.recognize(corrente.toBuffer("image/png"));
          if ((tentativo.data.confidence ?? 0) > (migliore.data.confidence ?? 0)) {
            migliore = tentativo;
          }
        }
      }

      risultato.push({
        indice: i - 1,
        testo: migliore.data.text,
        metodo: "OCR",
        confidenza: migliore.data.confidence != null ? migliore.data.confidence / 100 : null,
      });
    }
  } finally {
    await worker.terminate();
  }

  return risultato;
}
