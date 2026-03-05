import { useState, useCallback, useRef, useEffect } from "react";
import {
  SpreadsheetEngine,
  createEmptySpreadsheet,
  createEmptySheet,
  coordsToCellRef,
  cellRefToCoords,
  type SpreadsheetData,
  type SheetData,
  type CellFormat,
} from "@/lib/spreadsheet-engine";

export interface Selection {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

interface UndoEntry {
  sheetId: string;
  cellRef: string;
  oldValue: string;
  oldFormat?: CellFormat;
  newValue: string;
  newFormat?: CellFormat;
}

export function useSpreadsheet(initialData?: SpreadsheetData) {
  const [data, setData] = useState<SpreadsheetData>(
    initialData ?? createEmptySpreadsheet()
  );
  const [activeSheetId, setActiveSheetId] = useState(data.activeSheetId);
  const [selection, setSelection] = useState<Selection>({ startCol: 0, startRow: 0, endCol: 0, endRow: 0 });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const engineRef = useRef<SpreadsheetEngine | null>(null);
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);

  // Init engine
  useEffect(() => {
    engineRef.current?.destroy();
    engineRef.current = new SpreadsheetEngine(data);
    return () => engineRef.current?.destroy();
  }, []); // only on mount

  const getActiveSheet = useCallback((): SheetData => {
    return data.sheets.find((s) => s.id === activeSheetId) ?? data.sheets[0];
  }, [data.sheets, activeSheetId]);

  const getCellRawValue = useCallback((ref: string): string => {
    const sheet = getActiveSheet();
    return sheet.cells[ref] ?? "";
  }, [getActiveSheet]);

  const getCellDisplayValue = useCallback((col: number, row: number): string => {
    if (!engineRef.current) return "";
    const val = engineRef.current.getCellValue(activeSheetId, col, row);
    if (val === null || val === undefined) return "";
    if (typeof val === "object" && "type" in val) return "#ERROR";
    return String(val);
  }, [activeSheetId]);

  const getCellFormat = useCallback((ref: string): CellFormat => {
    const sheet = getActiveSheet();
    return sheet.formats[ref] ?? {};
  }, [getActiveSheet]);

  const setCellValue = useCallback((col: number, row: number, value: string) => {
    const ref = coordsToCellRef(col, row);
    const sheet = getActiveSheet();
    const oldValue = sheet.cells[ref] ?? "";

    undoStack.current.push({ sheetId: activeSheetId, cellRef: ref, oldValue, newValue: value });
    redoStack.current = [];

    engineRef.current?.setCellValue(activeSheetId, col, row, value);

    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === activeSheetId
          ? { ...s, cells: { ...s.cells, [ref]: value } }
          : s
      ),
    }));
  }, [activeSheetId, getActiveSheet]);

  const setCellFormat = useCallback((refs: string[], format: Partial<CellFormat>) => {
    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) => {
        if (s.id !== activeSheetId) return s;
        const newFormats = { ...s.formats };
        for (const ref of refs) {
          newFormats[ref] = { ...newFormats[ref], ...format };
        }
        return { ...s, formats: newFormats };
      }),
    }));
  }, [activeSheetId]);

  const getSelectedRefs = useCallback((): string[] => {
    const refs: string[] = [];
    const minCol = Math.min(selection.startCol, selection.endCol);
    const maxCol = Math.max(selection.startCol, selection.endCol);
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        refs.push(coordsToCellRef(c, r));
      }
    }
    return refs;
  }, [selection]);

  const startEditing = useCallback((col: number, row: number) => {
    const ref = coordsToCellRef(col, row);
    setEditingCell(ref);
    const formula = engineRef.current?.getCellFormula(activeSheetId, col, row);
    setEditValue(formula ?? getCellRawValue(ref));
  }, [activeSheetId, getCellRawValue]);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { col, row } = cellRefToCoords(editingCell);
    setCellValue(col, row, editValue);
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, setCellValue]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    const { col, row } = cellRefToCoords(entry.cellRef);
    engineRef.current?.setCellValue(entry.sheetId, col, row, entry.oldValue);
    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === entry.sheetId
          ? { ...s, cells: { ...s.cells, [entry.cellRef]: entry.oldValue } }
          : s
      ),
    }));
  }, []);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    const { col, row } = cellRefToCoords(entry.cellRef);
    engineRef.current?.setCellValue(entry.sheetId, col, row, entry.newValue);
    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === entry.sheetId
          ? { ...s, cells: { ...s.cells, [entry.cellRef]: entry.newValue } }
          : s
      ),
    }));
  }, []);

  const addSheet = useCallback(() => {
    const name = `Sheet ${data.sheets.length + 1}`;
    const newSheet = createEmptySheet(name);
    engineRef.current?.addSheet(name);
    setData((prev) => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
    }));
    setActiveSheetId(newSheet.id);
  }, [data.sheets.length]);

  const removeSheet = useCallback((sheetId: string) => {
    if (data.sheets.length <= 1) return;
    engineRef.current?.removeSheet(sheetId);
    setData((prev) => {
      const sheets = prev.sheets.filter((s) => s.id !== sheetId);
      return { ...prev, sheets };
    });
    if (activeSheetId === sheetId) {
      setActiveSheetId(data.sheets.find((s) => s.id !== sheetId)?.id ?? data.sheets[0].id);
    }
  }, [data.sheets, activeSheetId]);

  const renameSheet = useCallback((sheetId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) => (s.id === sheetId ? { ...s, name } : s)),
    }));
  }, []);

  const insertRow = useCallback((atRow: number) => {
    const sheet = getActiveSheet();
    const newCells: Record<string, string> = {};
    const newFormats: Record<string, CellFormat> = {};

    for (const [ref, val] of Object.entries(sheet.cells)) {
      const { col, row } = cellRefToCoords(ref);
      if (row >= atRow) {
        const newRef = coordsToCellRef(col, row + 1);
        newCells[newRef] = val;
        if (sheet.formats[ref]) newFormats[newRef] = sheet.formats[ref];
      } else {
        newCells[ref] = val;
        if (sheet.formats[ref]) newFormats[ref] = sheet.formats[ref];
      }
    }

    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === activeSheetId ? { ...s, cells: newCells, formats: newFormats } : s
      ),
    }));
  }, [activeSheetId, getActiveSheet]);

  const deleteRow = useCallback((atRow: number) => {
    const sheet = getActiveSheet();
    const newCells: Record<string, string> = {};
    const newFormats: Record<string, CellFormat> = {};

    for (const [ref, val] of Object.entries(sheet.cells)) {
      const { col, row } = cellRefToCoords(ref);
      if (row === atRow) continue;
      if (row > atRow) {
        const newRef = coordsToCellRef(col, row - 1);
        newCells[newRef] = val;
        if (sheet.formats[ref]) newFormats[newRef] = sheet.formats[ref];
      } else {
        newCells[ref] = val;
        if (sheet.formats[ref]) newFormats[ref] = sheet.formats[ref];
      }
    }

    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === activeSheetId ? { ...s, cells: newCells, formats: newFormats } : s
      ),
    }));
  }, [activeSheetId, getActiveSheet]);

  const insertColumn = useCallback((atCol: number) => {
    const sheet = getActiveSheet();
    const newCells: Record<string, string> = {};
    const newFormats: Record<string, CellFormat> = {};

    for (const [ref, val] of Object.entries(sheet.cells)) {
      const { col, row } = cellRefToCoords(ref);
      if (col >= atCol) {
        const newRef = coordsToCellRef(col + 1, row);
        newCells[newRef] = val;
        if (sheet.formats[ref]) newFormats[newRef] = sheet.formats[ref];
      } else {
        newCells[ref] = val;
        if (sheet.formats[ref]) newFormats[ref] = sheet.formats[ref];
      }
    }

    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === activeSheetId ? { ...s, cells: newCells, formats: newFormats } : s
      ),
    }));
  }, [activeSheetId, getActiveSheet]);

  const deleteColumn = useCallback((atCol: number) => {
    const sheet = getActiveSheet();
    const newCells: Record<string, string> = {};
    const newFormats: Record<string, CellFormat> = {};

    for (const [ref, val] of Object.entries(sheet.cells)) {
      const { col, row } = cellRefToCoords(ref);
      if (col === atCol) continue;
      if (col > atCol) {
        const newRef = coordsToCellRef(col - 1, row);
        newCells[newRef] = val;
        if (sheet.formats[ref]) newFormats[newRef] = sheet.formats[ref];
      } else {
        newCells[ref] = val;
        if (sheet.formats[ref]) newFormats[ref] = sheet.formats[ref];
      }
    }

    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === activeSheetId ? { ...s, cells: newCells, formats: newFormats } : s
      ),
    }));
  }, [activeSheetId, getActiveSheet]);

  const clearSelectedCells = useCallback(() => {
    const refs = getSelectedRefs();
    const sheet = getActiveSheet();
    const newCells = { ...sheet.cells };
    for (const ref of refs) {
      delete newCells[ref];
      const { col, row } = cellRefToCoords(ref);
      engineRef.current?.setCellValue(activeSheetId, col, row, "");
    }
    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === activeSheetId ? { ...s, cells: newCells } : s
      ),
    }));
  }, [activeSheetId, getActiveSheet, getSelectedRefs]);

  const setColWidth = useCallback((col: number, width: number) => {
    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id === activeSheetId ? { ...s, colWidths: { ...s.colWidths, [col]: width } } : s
      ),
    }));
  }, [activeSheetId]);

  return {
    data,
    setData,
    activeSheetId,
    setActiveSheetId,
    selection,
    setSelection,
    editingCell,
    editValue,
    setEditValue,
    getActiveSheet,
    getCellRawValue,
    getCellDisplayValue,
    getCellFormat,
    setCellValue,
    setCellFormat,
    getSelectedRefs,
    startEditing,
    commitEdit,
    cancelEdit,
    undo,
    redo,
    addSheet,
    removeSheet,
    renameSheet,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    clearSelectedCells,
    setColWidth,
    engine: engineRef,
  };
}
