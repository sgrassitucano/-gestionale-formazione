import * as XLSX from "xlsx";

export function exportToXlsx(
  data: Record<string, any>[],
  sheetName: string = "Report"
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

export function exportMultiSheetXlsx(
  sheets: Array<{ name: string; data: Record<string, any>[] }>
): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
