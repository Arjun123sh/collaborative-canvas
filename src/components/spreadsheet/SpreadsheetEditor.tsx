import { useState, useCallback, useRef, useEffect } from "react";
import { useSpreadsheet } from "@/hooks/useSpreadsheet";
import { SpreadsheetToolbar } from "./SpreadsheetToolbar";
import { SpreadsheetGrid } from "./SpreadsheetGrid";
import { SheetTabs } from "./SheetTabs";
import { ChartDialog } from "./ChartDialog";
import { coordsToCellRef, cellRefToCoords, type SpreadsheetData, type CellFormat } from "@/lib/spreadsheet-engine";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface Props {
  initialData?: SpreadsheetData;
  onDataChange?: (data: SpreadsheetData) => void;
}

export function SpreadsheetEditor({ initialData, onDataChange }: Props) {
  const ss = useSpreadsheet(initialData);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });
  const [chartOpen, setChartOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-save
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onDataChange?.(ss.data);
    }, 500);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [ss.data, onDataChange]);

  // Handle paste events
  useEffect(() => {
    const handler = (e: Event) => {
      const { rows, startCol, startRow } = (e as CustomEvent).detail;
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          ss.setCellValue(startCol + c, startRow + r, rows[r][c]);
        }
      }
    };
    window.addEventListener("spreadsheet-paste", handler);
    return () => window.removeEventListener("spreadsheet-paste", handler);
  }, [ss.setCellValue]);

  const selectedRef = coordsToCellRef(ss.selection.startCol, ss.selection.startRow);
  const currentFormat = ss.getCellFormat(selectedRef);
  const formulaBarValue = ss.editingCell
    ? ss.editValue
    : (ss.engine.current?.getCellFormula(ss.activeSheetId, ss.selection.startCol, ss.selection.startRow)
      ?? ss.getCellRawValue(selectedRef));

  const handleCellClick = useCallback((col: number, row: number, shiftKey: boolean) => {
    if (ss.editingCell) ss.commitEdit();
    if (shiftKey) {
      ss.setSelection((prev) => ({ ...prev, endCol: col, endRow: row }));
    } else {
      ss.setSelection({ startCol: col, startRow: row, endCol: col, endRow: row });
    }
  }, [ss]);

  const handleCellDoubleClick = useCallback((col: number, row: number) => {
    ss.startEditing(col, row);
  }, [ss]);

  const handleKeyNav = useCallback((key: string, shiftKey: boolean) => {
    if (key === "undo") { ss.undo(); return; }
    if (key === "redo") { ss.redo(); return; }

    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1],
      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      Tab: [shiftKey ? -1 : 1, 0], Enter: [0, 1],
    };
    const [dc, dr] = moves[key] ?? [0, 0];
    const newCol = Math.max(0, ss.selection.startCol + dc);
    const newRow = Math.max(0, ss.selection.startRow + dr);

    if (shiftKey && key.startsWith("Arrow")) {
      ss.setSelection((prev) => ({ ...prev, endCol: Math.max(0, prev.endCol + dc), endRow: Math.max(0, prev.endRow + dr) }));
    } else {
      ss.setSelection({ startCol: newCol, startRow: newRow, endCol: newCol, endRow: newRow });
    }
  }, [ss]);

  const handleFormatChange = useCallback((format: Partial<CellFormat>) => {
    ss.setCellFormat(ss.getSelectedRefs(), format);
  }, [ss]);

  const handleFormulaBarChange = useCallback((value: string) => {
    if (!ss.editingCell) {
      ss.startEditing(ss.selection.startCol, ss.selection.startRow);
    }
    ss.setEditValue(value);
  }, [ss]);

  const handleFormulaBarSubmit = useCallback(() => {
    ss.commitEdit();
  }, [ss]);

  // Import XLSX
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) return;

        const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
        for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = sheet[addr];
            if (cell) {
              ss.setCellValue(c, r, cell.f ? `=${cell.f}` : String(cell.v ?? ""));
            }
          }
        }
        toast.success("File imported successfully");
      } catch {
        toast.error("Failed to import file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, [ss]);

  // Export XLSX
  const handleExportXlsx = useCallback(() => {
    const activeSheet = ss.getActiveSheet();
    const wb = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [];

    let maxRow = 0, maxCol = 0;
    for (const ref of Object.keys(activeSheet.cells)) {
      const { col, row } = cellRefToCoords(ref);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }

    for (let r = 0; r <= maxRow; r++) {
      const row: (string | number)[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const val = ss.getCellDisplayValue(c, r);
        const num = Number(val);
        row.push(val === "" ? "" : isNaN(num) ? val : num);
      }
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, activeSheet.name);
    XLSX.writeFile(wb, `${activeSheet.name}.xlsx`);
    toast.success("Exported as XLSX");
  }, [ss]);

  // Export CSV
  const handleExportCsv = useCallback(() => {
    const activeSheet = ss.getActiveSheet();
    let maxRow = 0, maxCol = 0;
    for (const ref of Object.keys(activeSheet.cells)) {
      const { col, row } = cellRefToCoords(ref);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }

    const rows: string[] = [];
    for (let r = 0; r <= maxRow; r++) {
      const cols: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const val = ss.getCellDisplayValue(c, r);
        cols.push(val.includes(",") ? `"${val}"` : val);
      }
      rows.push(cols.join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as CSV");
  }, [ss]);

  return (
    <div className="h-full flex flex-col bg-background">
      <SpreadsheetToolbar
        currentFormat={currentFormat}
        formulaBarValue={formulaBarValue}
        selectedCellRef={selectedRef}
        onFormatChange={handleFormatChange}
        onUndo={ss.undo}
        onRedo={ss.redo}
        onImport={handleImport}
        onExportXlsx={handleExportXlsx}
        onExportCsv={handleExportCsv}
        onCreateChart={() => setChartOpen(true)}
        onFormulaBarChange={handleFormulaBarChange}
        onFormulaBarSubmit={handleFormulaBarSubmit}
      />

      <div ref={containerRef} className="flex-1 overflow-hidden">
        <SpreadsheetGrid
          getCellDisplayValue={ss.getCellDisplayValue}
          getCellFormat={ss.getCellFormat}
          colWidths={ss.getActiveSheet().colWidths}
          selection={ss.selection}
          editingCell={ss.editingCell}
          editValue={ss.editValue}
          onCellClick={handleCellClick}
          onCellDoubleClick={handleCellDoubleClick}
          onEditChange={ss.setEditValue}
          onEditSubmit={ss.commitEdit}
          onEditCancel={ss.cancelEdit}
          onKeyNav={handleKeyNav}
          onInsertRow={ss.insertRow}
          onDeleteRow={ss.deleteRow}
          onInsertColumn={ss.insertColumn}
          onDeleteColumn={ss.deleteColumn}
          onClearCells={ss.clearSelectedCells}
          onColResize={ss.setColWidth}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      </div>

      <SheetTabs
        sheets={ss.data.sheets}
        activeSheetId={ss.activeSheetId}
        onSelectSheet={ss.setActiveSheetId}
        onAddSheet={ss.addSheet}
        onRemoveSheet={ss.removeSheet}
        onRenameSheet={ss.renameSheet}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <ChartDialog
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        getDisplayValue={ss.getCellDisplayValue}
        selectionRange={ss.selection}
      />
    </div>
  );
}
