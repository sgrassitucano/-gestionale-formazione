// Matching di un documento (già letto via documento-reader) contro la lista
// chiusa di discenti iscritti all'aula. Non è riconoscimento libero: il
// sistema conosce già i candidati possibili, quindi basta trovare il più
// vicino per CF (match esatto, caso e-learning) o per nome (fuzzy match,
// caso Presenza/OCR) e valutarne la confidenza.

export interface DiscenteCandidato {
  id: string;
  cognome: string;
  nome: string;
  codiceFiscale?: string | null;
}

export interface MatchDiscente {
  discenteId: string;
  confidenza: number; // 0-1
  metodo: "CF_MATCH" | "NOME_FUZZY";
}

const RE_CF = /Codice fiscale:\s*\(?([A-Z0-9]{16})\)?/i;

export function estraiCodiceFiscale(testo: string): string | null {
  const match = testo.match(RE_CF);
  return match ? match[1].toUpperCase() : null;
}

function normalizza(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // rimuove accenti
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Similarità normalizzata 0-1 (1 = identico) basata su distanza di Levenshtein.
function similarita(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Trova il discente candidato più probabile per un testo estratto da un
 * documento. Prova prima il match esatto per CF (affidabile al 100%, tipico
 * dei PDF nativi e-learning); se non trova CF nel testo, cade sul fuzzy match
 * sul nome completo (caso OCR/scansione, dove il CF non è quasi mai presente
 * sul documento cartaceo).
 */
export function trovaDiscenteMatch(
  testo: string,
  candidati: DiscenteCandidato[]
): MatchDiscente | null {
  const cf = estraiCodiceFiscale(testo);
  if (cf) {
    const trovato = candidati.find((c) => c.codiceFiscale?.toUpperCase() === cf);
    if (trovato) return { discenteId: trovato.id, confidenza: 1, metodo: "CF_MATCH" };
  }

  const testoNormalizzato = normalizza(testo);
  let migliore: MatchDiscente | null = null;

  for (const candidato of candidati) {
    const nomeCompleto = normalizza(`${candidato.cognome} ${candidato.nome}`);
    // Cerca la migliore sottostringa contigua di lunghezza pari al nome
    // dentro il testo del documento (l'OCR aggiunge rumore prima/dopo il nome).
    const punteggio = migliorPunteggioSottostringa(testoNormalizzato, nomeCompleto);
    if (!migliore || punteggio > migliore.confidenza) {
      migliore = { discenteId: candidato.id, confidenza: punteggio, metodo: "NOME_FUZZY" };
    }
  }

  return migliore;
}

function migliorPunteggioSottostringa(testo: string, target: string): number {
  if (testo.includes(target)) return 1;
  const finestra = target.length;
  let migliore = 0;
  for (let i = 0; i <= Math.max(0, testo.length - finestra); i++) {
    const chunk = testo.slice(i, i + finestra);
    const score = similarita(chunk, target);
    if (score > migliore) migliore = score;
  }
  // Fallback se il testo è più corto del target (pagina quasi vuota)
  return Math.max(migliore, similarita(testo, target));
}

// Soglie di confidenza per la UI di conferma:
// >= 0.85 → verde (auto-accettabile con revisione rapida)
// >= 0.6  → giallo (richiede conferma esplicita)
// <  0.6  → rosso (probabile mismatch, richiede assegnazione manuale)
export function livelloConfidenza(confidenza: number): "ALTA" | "MEDIA" | "BASSA" {
  if (confidenza >= 0.85) return "ALTA";
  if (confidenza >= 0.6) return "MEDIA";
  return "BASSA";
}
