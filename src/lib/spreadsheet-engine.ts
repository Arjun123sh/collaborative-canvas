import HyperFormula, { type CellValue } from "hyperformula";

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  textColor?: string;
  bgColor?: string;
  align?: "left" | "center" | "right";
  numberFormat?: "general" | "number" | "currency" | "percentage" | "date";
}

export interface SheetData {
  id: string;
  name: string;
  cells: Record<string, string>;
  formats: Record<string, CellFormat>;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  frozenRows?: number;
  frozenCols?: number;
}

export interface SpreadsheetData {
  sheets: SheetData[];
  activeSheetId: string;
}

export function createEmptySheet(name: string): SheetData {
  return {
    id: crypto.randomUUID(),
    name,
    cells: {},
    formats: {},
    colWidths: {},
    rowHeights: {},
  };
}

export function createEmptySpreadsheet(): SpreadsheetData {
  const sheet = createEmptySheet("Sheet 1");
  return { sheets: [sheet], activeSheetId: sheet.id };
}

export function colIndexToLetter(index: number): string {
  let letter = "";
  let i = index;
  while (i >= 0) {
    letter = String.fromCharCode(65 + (i % 26)) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}

export function letterToColIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function cellRefToCoords(ref: string): { col: number; row: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: 0, row: 0 };
  return { col: letterToColIndex(match[1]), row: parseInt(match[2]) - 1 };
}

export function coordsToCellRef(col: number, row: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

export class SpreadsheetEngine {
  private hf: HyperFormula;
  private sheetMapping: Map<string, number> = new Map(); // sheetId -> hfSheetId

  constructor(data: SpreadsheetData) {
    this.hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" });
    for (const sheet of data.sheets) {
      this.loadSheet(sheet);
    }
  }

  private loadSheet(sheet: SheetData) {
    const sheetName = sheet.name.replace(/[^a-zA-Z0-9 _-]/g, "_");
    const returnedName = this.hf.addSheet(sheetName);
    const hfId = this.hf.getSheetId(returnedName);
    if (hfId === undefined) return;
    this.sheetMapping.set(sheet.id, hfId);

    let maxRow = 0, maxCol = 0;
    for (const ref of Object.keys(sheet.cells)) {
      const { col, row } = cellRefToCoords(ref);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }

    const matrix: (string | number | null)[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const row: (string | number | null)[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const ref = coordsToCellRef(c, r);
        const raw = sheet.cells[ref];
        if (raw === undefined || raw === "") {
          row.push(null);
        } else if (raw.startsWith("=")) {
          row.push(raw);
        } else {
          const num = Number(raw);
          row.push(isNaN(num) ? raw : num);
        }
      }
      matrix.push(row);
    }

    if (matrix.length > 0) {
      this.hf.setSheetContent(hfId, matrix);
    }
  }

  getSheetHfId(sheetId: string): number {
    return this.sheetMapping.get(sheetId) ?? 0;
  }

  getCellValue(sheetId: string, col: number, row: number): CellValue {
    const hfId = this.getSheetHfId(sheetId);
    try {
      return this.hf.getCellValue({ sheet: hfId, col, row });
    } catch {
      return null;
    }
  }

  setCellValue(sheetId: string, col: number, row: number, value: string) {
    const hfId = this.getSheetHfId(sheetId);
    try {
      if (value === "") {
        this.hf.setCellContents({ sheet: hfId, col, row }, null);
      } else if (value.startsWith("=")) {
        this.hf.setCellContents({ sheet: hfId, col, row }, value);
      } else {
        const num = Number(value);
        this.hf.setCellContents({ sheet: hfId, col, row }, isNaN(num) ? value : num);
      }
    } catch {
      // Silently handle formula errors
    }
  }

  getCellFormula(sheetId: string, col: number, row: number): string | undefined {
    const hfId = this.getSheetHfId(sheetId);
    try {
      if (this.hf.doesCellHaveFormula({ sheet: hfId, col, row })) {
        return this.hf.getCellFormula({ sheet: hfId, col, row }) ?? undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  addSheet(name: string): { sheetId: string; hfId: number } {
    const sheetId = crypto.randomUUID();
    const sheetName = name.replace(/[^a-zA-Z0-9 _-]/g, "_");
    const returnedName = this.hf.addSheet(sheetName);
    const hfId = this.hf.getSheetId(returnedName) ?? 0;
    this.sheetMapping.set(sheetId, hfId);
    return { sheetId, hfId };
  }

  removeSheet(sheetId: string) {
    const hfId = this.sheetMapping.get(sheetId);
    if (hfId !== undefined) {
      this.hf.removeSheet(hfId);
      this.sheetMapping.delete(sheetId);
    }
  }

  destroy() {
    this.hf.destroy();
  }
}

export function formatCellValue(value: CellValue, format?: CellFormat): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "type" in value) return "#ERROR";

  const num = typeof value === "number" ? value : NaN;

  if (!format?.numberFormat || format.numberFormat === "general") {
    return String(value);
  }

  if (isNaN(num)) return String(value);

  switch (format.numberFormat) {
    case "number":
      return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "currency":
      return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
    case "percentage":
      return (num * 100).toFixed(2) + "%";
    case "date": {
      const d = new Date(num);
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    default:
      return String(value);
  }
}
