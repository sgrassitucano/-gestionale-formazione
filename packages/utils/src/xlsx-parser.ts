import * as XLSX from "xlsx";

export interface XlsxParseResult {
  rows: Record<string, any>[];
  errors: Array<{ line: number; message: string }>;
}

const REQUIRED_COLUMNS = [
  "cognome",
  "nome",
  "codiceFiscale",
  "email",
  "cellulare",
  "dataNascita",
  "azienda",
];

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

    const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());
    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) => !headers.includes(col.toLowerCase())
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

    // Normalize rows (lowercase keys)
    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[key.toLowerCase().trim()] = value;
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
