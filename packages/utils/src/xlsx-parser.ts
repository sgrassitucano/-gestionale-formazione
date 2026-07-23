import * as XLSX from "xlsx";

export interface XlsxParseResult {
  rows: Record<string, any>[];
  errors: Array<{ line: number; message: string }>;
}

// Solo cognome/nome/codiceFiscale sono davvero indispensabili per creare
// un'anagrafica: email/cellulare/dataNascita sono opzionali (vedi
// discenti-validator.ts), e "azienda" ha un fallback a "Default" nelle
// route di import — non deve bloccare il parsing se assente. Il file
// sorgente può contenere qualunque altra colonna (tipo corso, stato,
// data esecuzione...): non ci interessa, l'aula/corso li sceglie
// l'utente nel wizard, non il file.
const REQUIRED_COLUMNS = ["cognome", "nome", "codiceFiscale"];

// Alias per varianti di header comuni nei file reali (fonti esterne,
// export da altri gestionali): stesso significato, nome colonna diverso.
const HEADER_ALIASES: Record<string, string> = {
  mail: "email",
  cf: "codicefiscale",
  telefono: "cellulare",
};

function normalizeHeader(h: string): string {
  const collapsed = h.toLowerCase().trim().replace(/\s+/g, "");
  return HEADER_ALIASES[collapsed] || collapsed;
}

export async function parseXlsxFile(buffer: Buffer): Promise<XlsxParseResult> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    const errors: Array<{ line: number; message: string }> = [];

    // Validate headers
    if (rows.length === 0) {
      return { rows: [], errors: [{ line: 1, message: "File is empty" }] };
    }

    const headers = Object.keys(rows[0]).map(normalizeHeader);
    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) => !headers.includes(normalizeHeader(col))
    );

    if (missingColumns.length > 0) {
      return {
        rows: [],
        errors: [
          {
            line: 1,
            message: `Missing columns: ${missingColumns.join(", ")}`,
          },
        ],
      };
    }

    // Normalize rows (normalized header keys, spazi/alias risolti)
    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = value;
      });
      return normalized;
    });

    return { rows: normalizedRows, errors };
  } catch (error) {
    return {
      rows: [],
      errors: [{ line: 1, message: `Parse error: ${(error as Error).message}` }],
    };
  }
}
