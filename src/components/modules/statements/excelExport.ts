import * as XLSX from 'xlsx';
import { toWesternDigits } from '../../../utils/formatters';

export interface ExcelExportOptions {
  fileName: string;
  sheetName?: string;
  title?: string;
  metadata?: { [key: string]: string };
  headers: string[];
  data: (string | number | null | undefined)[][];
}

export function exportStatementToExcel(options: ExcelExportOptions) {
  const { fileName, sheetName = 'كشف الحساب', title, metadata, headers, data } = options;

  // Build rows array with header metadata
  const rows: any[][] = [];

  if (title) {
    rows.push([title]);
    rows.push([]);
  }

  if (metadata) {
    Object.entries(metadata).forEach(([key, val]) => {
      rows.push([key, typeof val === 'string' ? toWesternDigits(val) : val]);
    });
    rows.push([]);
  }

  // Add Arabic Column Headers
  rows.push(headers);

  // Add Transaction Data Rows with Western digits
  data.forEach(row => {
    rows.push(row.map(cell => (typeof cell === 'string' ? toWesternDigits(cell) : cell)));
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Auto-calculate column widths
  const colWidths = headers.map((h, i) => {
    let maxLen = h.length;
    data.forEach(row => {
      const cellVal = row[i];
      if (cellVal !== undefined && cellVal !== null) {
        const str = String(cellVal);
        if (str.length > maxLen) maxLen = str.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });

  worksheet['!cols'] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Trigger real .xlsx download
  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, cleanFileName);
}
