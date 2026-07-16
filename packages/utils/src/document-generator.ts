/**
 * Generates a filled document from a template + data map.
 * Supports DOCX (docxtemplater), HTML (Handlebars), PDF (text-overlay fallback).
 */

export async function generateDocxFromTemplate(
  templateBuffer: Buffer,
  data: Record<string, any>
): Promise<Buffer> {
  const PizZip = (await import("pizzip")).default;
  const Docxtemplater = (await import("docxtemplater")).default;

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  doc.render(data);

  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  return buffer;
}

export async function generateHtmlFromTemplate(
  templateContent: string,
  data: Record<string, any>
): Promise<string> {
  const Handlebars = (await import("handlebars")).default;
  const template = Handlebars.compile(templateContent);
  return template(data);
}

/**
 * For PDF templates: since text replacement in PDF is complex without AcroForm fields,
 * we render an HTML equivalent (from mapped data) and convert via pdf-lib as a simple
 * text-based document. For production use with AcroForm PDFs, use pdf-lib's form.getTextField().
 */
export async function generatePdfFromData(
  title: string,
  data: Record<string, any>
): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  let y = height - 50;
  page.drawText(title, { x: 50, y, size: 16, font, color: rgb(0, 0, 0) });
  y -= 40;

  for (const [key, value] of Object.entries(data)) {
    page.drawText(`${key}: ${value}`, { x: 50, y, size: 10, font });
    y -= 20;
    if (y < 50) {
      y = height - 50;
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * Fills an XLSX template: writes one row per item in `rows`, starting at `startRow`,
 * mapping each `columnFields` entry (column letter + dot-path) to a cell.
 * Header rows above `startRow` are left untouched.
 */
export async function fillXlsxTemplate(
  templateBuffer: Buffer,
  columnFields: Array<{ column: string; sorgenteDato: string }>,
  rowContexts: Array<Record<string, any>>,
  startRow: number = 2
): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(templateBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");

  rowContexts.forEach((context, idx) => {
    const rowNum = startRow + idx;
    for (const { column, sorgenteDato } of columnFields) {
      let value: any;

      if (sorgenteDato.startsWith("literal:")) {
        value = sorgenteDato.slice("literal:".length);
      } else if (sorgenteDato === "computed.usernamePiattaforma") {
        const cf = (context as any).discente?.codiceFiscale as string | undefined;
        value = cf ? cf.slice(0, 6).toUpperCase() : null;
      } else {
        const parts = sorgenteDato.split(".");
        value = context;
        for (const part of parts) {
          value = value?.[part];
        }
        if (value instanceof Date) {
          value = value.toLocaleDateString("it-IT");
        }
      }

      if (value == null) continue;

      const cellRef = `${column}${rowNum}`;
      sheet[cellRef] = { t: "s", v: String(value) };

      const cellAddr = XLSX.utils.decode_cell(cellRef);
      range.e.r = Math.max(range.e.r, cellAddr.r);
      range.e.c = Math.max(range.e.c, cellAddr.c);
    }
  });

  sheet["!ref"] = XLSX.utils.encode_range(range);

  const outBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return outBuffer;
}

/**
 * Resolves dot-notation data paths (e.g. "discente.nome") against a context object
 * into a flat map suitable for template rendering.
 */
export function resolveFieldMappings(
  mappings: Array<{ nomeCampo: string; sorgenteDato: string }>,
  context: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const { nomeCampo, sorgenteDato } of mappings) {
    if (sorgenteDato === "system.dataOggi") {
      result[nomeCampo] = new Date().toLocaleDateString("it-IT");
      continue;
    }

    const parts = sorgenteDato.split(".");
    let value: any = context;
    for (const part of parts) {
      value = value?.[part];
    }

    if (value instanceof Date) {
      result[nomeCampo] = value.toLocaleDateString("it-IT");
    } else {
      result[nomeCampo] = value ?? "";
    }
  }

  return result;
}
