// Assembla lo ZIP finale di chiusura aula, con la struttura di cartelle
// decisa per ciascuna modalità (Presenza / FAD Sincrona / FAD Asincrona).
// La struttura è "schematica e programmabile a monte", come richiesto:
// ogni tipoDocumento mappa a una cartella fissa per modalità.

import JSZip from "jszip";

export type Modalita = "PRESENZA" | "FAD_SINCRONA" | "FAD_ASINCRONA";

export interface DocumentoZip {
  tipoDocumento: string;
  discente: { cognome: string; nome: string } | null; // null = documento a livello aula
  fileBuffer: Buffer;
  fileUrl: string; // usato solo per recuperare l'estensione originale
}

interface RegolaCartella {
  cartella: string;
  suffissoFile?: string; // aggiunto al nome file per-discente, es. "_test_(corso)"
}

// Presenza: schema confermato con l'utente.
const SCHEMA_PRESENZA: Record<string, RegolaCartella> = {
  REGISTRO: { cartella: "Registro_Presenze" },
  RESOCONTO: { cartella: "Resoconto_Apprendimento" },
  TEST: { cartella: "Test_Finale", suffissoFile: "_test" },
  GRADIMENTO: { cartella: "Questionario_Gradimento" },
  FASCICOLO_STATICO: { cartella: "Fascicolo_Corso" },
  EBAFOS: { cartella: "EBAFOS" },
  REPORT_QUESTIONARIO: { cartella: "Report_Questionario" },
  ATTESTATO: { cartella: "Attestati", suffissoFile: "_corso" },
};

// FAD Asincrona (E-learning): schema confermato con l'utente.
const SCHEMA_ASINCRONA: Record<string, RegolaCartella> = {
  EBAFOS: { cartella: "Caricamenti" },
  PIATTAFORMA: { cartella: "Caricamenti" },
  LISTA_CORSISTI: { cartella: "Caricamenti" },
  AUTODICHIARAZIONE: { cartella: "Caricamenti" },
  TEST_INTERMEDI: { cartella: "Esiti_Test_Intermedi", suffissoFile: "_intermedi" },
  TEST_FINALE: { cartella: "Esiti_Test_Finale", suffissoFile: "_finale" },
  TEST_GRADIMENTO: { cartella: "Esiti_Test_Gradimento", suffissoFile: "_gradimento" },
  FASCICOLO: { cartella: "Fascicolo" },
  REGISTRO: { cartella: "Registro" },
  RESOCONTO: { cartella: "Resoconto_Apprendimento" },
  REPORT_QUESTIONARIO: { cartella: "Report_Questionario" },
  ATTESTATO: { cartella: "Attestati" },
};

// FAD Sincrona: BOZZA non validata (vedi memoria progetto).
const SCHEMA_SINCRONA: Record<string, RegolaCartella> = {
  EBAFOS: { cartella: "Caricamenti" },
  PIATTAFORMA: { cartella: "Caricamenti" },
  LISTA_CORSISTI: { cartella: "Caricamenti" },
  AUTODICHIARAZIONE: { cartella: "Caricamenti" },
  TEST_FINALE: { cartella: "Esiti_Test_Finale", suffissoFile: "_finale" },
  GRADIMENTO: { cartella: "Questionario_Gradimento" },
  FASCICOLO: { cartella: "Fascicolo" },
  REGISTRO: { cartella: "Registro" },
  RESOCONTO: { cartella: "Resoconto_Apprendimento" },
  REPORT_QUESTIONARIO: { cartella: "Report_Questionario" },
  ATTESTATO: { cartella: "Attestati" },
};

const SCHEMI: Record<Modalita, Record<string, RegolaCartella>> = {
  PRESENZA: SCHEMA_PRESENZA,
  FAD_SINCRONA: SCHEMA_SINCRONA,
  FAD_ASINCRONA: SCHEMA_ASINCRONA,
};

function estensioneDa(fileUrl: string): string {
  const senzaQuery = fileUrl.split("?")[0];
  const match = senzaQuery.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1] : "pdf";
}

function normalizzaNomeFile(s: string): string {
  return s.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

export function costruisciZipChiusuraAula(
  modalita: Modalita,
  nomeCartellaRadice: string,
  documenti: DocumentoZip[]
): Promise<Buffer> {
  const schema = SCHEMI[modalita];
  const zip = new JSZip();
  const radice = zip.folder(normalizzaNomeFile(nomeCartellaRadice))!;

  // Contatore per evitare collisioni di nome tra file dello stesso tipo/discente
  // (es. più caricamenti dello stesso tipo per lo stesso discente).
  const contatori = new Map<string, number>();

  for (const doc of documenti) {
    const regola = schema[doc.tipoDocumento];
    const cartella = regola?.cartella ?? normalizzaNomeFile(doc.tipoDocumento);
    const suffisso = regola?.suffissoFile ?? "";
    const ext = estensioneDa(doc.fileUrl);

    const nomeBase = doc.discente
      ? `${normalizzaNomeFile(doc.discente.cognome)}_${normalizzaNomeFile(doc.discente.nome)}${suffisso}`
      : normalizzaNomeFile(doc.tipoDocumento);

    const chiaveContatore = `${cartella}/${nomeBase}`;
    const occorrenza = (contatori.get(chiaveContatore) ?? 0) + 1;
    contatori.set(chiaveContatore, occorrenza);
    const nomeFile = occorrenza > 1 ? `${nomeBase}_${occorrenza}.${ext}` : `${nomeBase}.${ext}`;

    radice.folder(cartella)!.file(nomeFile, doc.fileBuffer);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
