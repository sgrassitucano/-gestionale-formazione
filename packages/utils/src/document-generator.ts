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
