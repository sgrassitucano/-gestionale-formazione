// Legge le pagine "Quiz di gradimento" (testo nativo, isolate da
// esiti-test-splitter come sezione GRADIMENTO/tipoDocumento TEST_GRADIMENTO)
// ed estrae voto (1-4) per ogni domanda. Aggrega su più discenti per
// produrre il Report Questionario xlsx dell'aula.

export interface RispostaGradimento {
  numeroDomanda: number;
  testoDomanda: string;
  voto: number; // 1-4
}

export interface GradimentoDiscente {
  discente: { cognome: string; nome: string };
  risposte: RispostaGradimento[];
}

const RE_DOMANDA_MARKER = /DOMANDA\s+(\d+)\s+DI\s+(\d+)/g;
const RE_TESTO_DOMANDA = /(?:CORRETTA|ERRATA)\s*(.+?)\s*Dai\s+1\s+voto/s;
const RE_VOTO_SCELTO = /(\d)\s*TUA SCELTA/;

/**
 * Estrae le risposte del questionario di gradimento dal testo concatenato
 * delle pagine GRADIMENTO di un discente (testo nativo, non serve OCR).
 */
export function parseGradimento(testoPagine: string): RispostaGradimento[] {
  const marker = [...testoPagine.matchAll(RE_DOMANDA_MARKER)];
  const risposte: RispostaGradimento[] = [];

  for (let i = 0; i < marker.length; i++) {
    const inizio = marker[i].index!;
    const fine = i + 1 < marker.length ? marker[i + 1].index! : testoPagine.length;
    const chunk = testoPagine.slice(inizio, fine);

    const numeroDomanda = parseInt(marker[i][1], 10);

    const matchTesto = chunk.match(RE_TESTO_DOMANDA);
    const testoDomanda = matchTesto ? matchTesto[1].trim() : "";

    const matchVoto = chunk.match(RE_VOTO_SCELTO);
    if (!matchVoto) continue; // domanda senza risposta rilevabile, scartata (non inventiamo un voto)

    risposte.push({
      numeroDomanda,
      testoDomanda,
      voto: parseInt(matchVoto[1], 10),
    });
  }

  return risposte;
}

import { exportToXlsx } from "./xlsx-exporter";

/**
 * Costruisce l'xlsx Report Questionario: una riga per corsista (anonimo,
 * nessun nome), una colonna per domanda (voto 1-4), riga finale con la
 * media di ogni colonna. Le domande sono ordinate per numero e prendono il
 * testo dalla prima occorrenza trovata (uguale per tutti i discenti dello
 * stesso questionario).
 */
export function generateReportQuestionarioXlsx(dati: GradimentoDiscente[]): Buffer {
  const testoDomandaPerNumero = new Map<number, string>();
  for (const d of dati) {
    for (const r of d.risposte) {
      if (!testoDomandaPerNumero.has(r.numeroDomanda)) {
        testoDomandaPerNumero.set(r.numeroDomanda, r.testoDomanda);
      }
    }
  }
  const numeriDomande = Array.from(testoDomandaPerNumero.keys()).sort((a, b) => a - b);
  const intestazioni = numeriDomande.map((n) => `D${n}. ${testoDomandaPerNumero.get(n)}`);

  const righe: Record<string, number | string>[] = dati.map((d) => {
    const votoPerNumero = new Map(d.risposte.map((r) => [r.numeroDomanda, r.voto]));
    const riga: Record<string, number | string> = {};
    numeriDomande.forEach((n, i) => {
      riga[intestazioni[i]] = votoPerNumero.get(n) ?? "";
    });
    return riga;
  });

  const rigaMedia: Record<string, number | string> = {};
  numeriDomande.forEach((n, i) => {
    const voti = dati
      .map((d) => d.risposte.find((r) => r.numeroDomanda === n)?.voto)
      .filter((v): v is number => v !== undefined);
    rigaMedia[intestazioni[i]] = voti.length > 0 ? Number((voti.reduce((s, v) => s + v, 0) / voti.length).toFixed(2)) : "";
  });
  righe.push(rigaMedia);

  return exportToXlsx(righe, "Questionario Gradimento");
}
