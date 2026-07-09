export interface ExtractedField {
  placeholder: string; // "{{nome_discente}}"
  nomeCampo: string; // "nome_discente"
}

const PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

/**
 * Extracts {{placeholder}} fields from plain text content.
 * Works for HTML, TXT, and text extracted from DOCX/PDF.
 */
export function extractFieldsFromText(text: string): ExtractedField[] {
  const fields = new Map<string, ExtractedField>();
  let match: RegExpExecArray | null;

  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    const nomeCampo = match[1];
    if (!fields.has(nomeCampo)) {
      fields.set(nomeCampo, {
        placeholder: match[0],
        nomeCampo,
      });
    }
  }

  return Array.from(fields.values());
}

/**
 * Extracts text content from a DOCX buffer using mammoth.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extracts text content from a PDF buffer using pdf-parse.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

/**
 * Extracts text content from HTML buffer (raw, placeholders are literal text).
 */
export function extractTextFromHtml(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

/**
 * Detects mime type and extracts fields accordingly.
 */
export async function extractFieldsFromTemplate(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedField[]> {
  let text: string;

  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) {
    text = await extractTextFromDocx(buffer);
  } else if (mimeType.includes("pdf")) {
    text = await extractTextFromPdf(buffer);
  } else {
    text = extractTextFromHtml(buffer);
  }

  return extractFieldsFromText(text);
}

/**
 * Common field suggestions for auto-mapping (sorgente dato paths).
 */
export const COMMON_FIELD_MAPPINGS: Record<string, string> = {
  nome_discente: "discente.nome",
  cognome_discente: "discente.cognome",
  cf_discente: "discente.codiceFiscale",
  data_nascita: "discente.dataNascita",
  corso_titolo: "corso.titolo",
  corso_codice: "corso.codice",
  aula_luogo: "aula.luogo",
  aula_data_inizio: "aula.dataInizio",
  aula_data_fine: "aula.dataFine",
  docente_nome: "docente.nome",
  docente_cognome: "docente.cognome",
  data_oggi: "system.dataOggi",
};
