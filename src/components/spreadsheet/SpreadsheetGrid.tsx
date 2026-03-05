import { useRef, useCallback, useEffect, useState, memo } from "react";
import { Grid, type CellComponentProps } from "react-window";
import {
  colIndexToLetter,
  coordsToCellRef,
  formatCellValue,
  type CellFormat,
} from "@/lib/spreadsheet-engine";
import type { Selection } from "@/hooks/useSpreadsheet";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const ROW_HEADER_WIDTH = 48;
const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 28;
const TOTAL_COLS = 200;
const TOTAL_ROWS = 10000;

interface GridCellData {
  getCellDisplayValue: (col: number, row: number) => string;
  getCellFormat: (ref: string) => CellFormat;
  selection: Selection;
  editingCell: string | null;
  editValue: string;
  onCellClick: (col: number, row: number, shiftKey: boolean) => void;
  onCellDoubleClick: (col: number, row: number) => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onKeyNav: (key: string, shiftKey: boolean) => void;
  onContextCell: (col: number, row: number) => void;
  isDragging: boolean;
  handleResizeStart: (col: number, e: React.MouseEvent) => void;
}

interface Props {
  getCellDisplayValue: (col: number, row: number) => string;
  getCellFormat: (ref: string) => CellFormat;
  colWidths: Record<number, number>;
  selection: Selection;
  editingCell: string | null;
  editValue: string;
  onCellClick: (col: number, row: number, shiftKey: boolean) => void;
  onCellDoubleClick: (col: number, row: number) => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onKeyNav: (key: string, shiftKey: boolean) => void;
  onInsertRow: (row: number) => void;
  onDeleteRow: (row: number) => void;
  onInsertColumn: (col: number) => void;
  onDeleteColumn: (col: number) => void;
  onClearCells: () => void;
  onColResize: (col: number, width: number) => void;
  containerWidth: number;
  containerHeight: number;
}

export function SpreadsheetGrid({
  getCellDisplayValue,
  getCellFormat,
  colWidths,
  selection,
  editingCell,
  editValue,
  onCellClick,
  onCellDoubleClick,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onKeyNav,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onClearCells,
  onColResize,
  containerWidth,
  containerHeight,
}: Props) {
  const [contextCell, setContextCell] = useState<{ col: number; row: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const getColWidth = useCallback((col: number) => colWidths[col] ?? DEFAULT_COL_WIDTH, [colWidths]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleResizeStart = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(col);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = getColWidth(col);
  }, [getColWidth]);

  useEffect(() => {
    if (resizingCol === null) return;
    const handleMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(40, resizeStartWidth.current + diff);
      onColResize(resizingCol, newWidth);
    };
    const handleUp = () => setResizingCol(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [resizingCol, onColResize]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCell) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onClearCells();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        onKeyNav("undo", false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        onKeyNav("redo", false);
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key)) {
        e.preventDefault();
        onKeyNav(e.key, e.shiftKey);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        onCellDoubleClick(selection.startCol, selection.startRow);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingCell, onKeyNav, onCellDoubleClick, onClearCells, selection]);

  // Copy/Paste
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (editingCell) return;
      e.preventDefault();
      const minCol = Math.min(selection.startCol, selection.endCol);
      const maxCol = Math.max(selection.startCol, selection.endCol);
      const minRow = Math.min(selection.startRow, selection.endRow);
      const maxRow = Math.max(selection.startRow, selection.endRow);

      const rows: string[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const cols: string[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          cols.push(getCellDisplayValue(c, r));
        }
        rows.push(cols.join("\t"));
      }
      e.clipboardData?.setData("text/plain", rows.join("\n"));
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (editingCell) return;
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const rows = text.split("\n").map((r) => r.split("\t"));
      window.dispatchEvent(new CustomEvent("spreadsheet-paste", {
        detail: { rows, startCol: selection.startCol, startRow: selection.startRow },
      }));
    };

    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
    };
  }, [editingCell, selection, getCellDisplayValue]);

  const isSelected = useCallback((col: number, row: number) => {
    const minCol = Math.min(selection.startCol, selection.endCol);
    const maxCol = Math.max(selection.startCol, selection.endCol);
    const minRow = Math.min(selection.startRow, selection.endRow);
    const maxRow = Math.max(selection.startRow, selection.endRow);
    return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow;
  }, [selection]);

  const isActiveCell = useCallback((col: number, row: number) => {
    return col === selection.startCol && row === selection.startRow;
  }, [selection]);

  // Render the grid manually with a scrollable div (simpler than react-window v2 API migration)
  // We'll use a simple virtualized approach with overflow scroll
  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    
    // Header row
    const headerCells: React.ReactNode[] = [
      <div key="corner" className="sticky left-0 z-20 bg-muted border-b border-r border-border flex items-center justify-center"
        style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH, height: DEFAULT_ROW_HEIGHT }}
      />
    ];
    
    for (let c = 0; c < 52; c++) {
      headerCells.push(
        <div
          key={`h${c}`}
          className="bg-muted border-b border-r border-border flex items-center justify-center text-xs font-medium text-muted-foreground select-none relative shrink-0"
          style={{ width: getColWidth(c), minWidth: getColWidth(c), height: DEFAULT_ROW_HEIGHT }}
        >
          {colIndexToLetter(c)}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 z-10"
            onMouseDown={(e) => handleResizeStart(c, e)}
          />
        </div>
      );
    }
    
    rows.push(
      <div key="header" className="flex sticky top-0 z-10" style={{ height: DEFAULT_ROW_HEIGHT }}>
        {headerCells}
      </div>
    );

    // Data rows
    for (let r = 0; r < 200; r++) {
      const cells: React.ReactNode[] = [
        <div
          key={`rh${r}`}
          className="sticky left-0 z-10 bg-muted border-b border-r border-border flex items-center justify-center text-xs font-medium text-muted-foreground select-none shrink-0"
          style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH, height: DEFAULT_ROW_HEIGHT }}
        >
          {r + 1}
        </div>
      ];

      for (let c = 0; c < 52; c++) {
        const ref = coordsToCellRef(c, r);
        const isEditing = editingCell === ref;
        const selected = isSelected(c, r);
        const active = isActiveCell(c, r);
        const format = getCellFormat(ref);
        const displayVal = getCellDisplayValue(c, r);
        const formattedVal = formatCellValue(
          displayVal === "" ? null : (isNaN(Number(displayVal)) ? displayVal : Number(displayVal)),
          format
        );

        cells.push(
          <div
            key={`c${c}`}
            className={`border-b border-r border-border flex items-center px-1 text-xs cursor-cell select-none relative shrink-0
              ${active ? "ring-2 ring-primary ring-inset z-10" : ""}
            `}
            style={{
              width: getColWidth(c),
              minWidth: getColWidth(c),
              height: DEFAULT_ROW_HEIGHT,
              backgroundColor: selected
                ? "hsl(var(--primary) / 0.08)"
                : format.bgColor ?? undefined,
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              setIsDragging(true);
              onCellClick(c, r, e.shiftKey);
            }}
            onMouseEnter={() => {
              if (isDragging) onCellClick(c, r, true);
            }}
            onDoubleClick={() => onCellDoubleClick(c, r)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextCell({ col: c, row: r });
            }}
          >
            {isEditing ? (
              <input
                className="w-full h-full bg-background border-none outline-none text-xs font-mono px-0.5"
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); onEditSubmit(); }
                  if (e.key === "Escape") onEditCancel();
                  if (e.key === "Tab") { e.preventDefault(); onEditSubmit(); onKeyNav("Tab", e.shiftKey); }
                }}
                onBlur={onEditSubmit}
                autoFocus
              />
            ) : (
              <span
                className="truncate w-full"
                style={{
                  fontWeight: format.bold ? 700 : undefined,
                  fontStyle: format.italic ? "italic" : undefined,
                  fontSize: format.fontSize ? `${format.fontSize}px` : undefined,
                  color: format.textColor ?? undefined,
                  textAlign: format.align ?? "left",
                  display: "block",
                }}
              >
                {formattedVal}
              </span>
            )}
          </div>
        );
      }

      rows.push(
        <div key={`r${r}`} className="flex" style={{ height: DEFAULT_ROW_HEIGHT }}>
          {cells}
        </div>
      );
    }

    return rows;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="flex-1 overflow-auto relative"
          style={{ width: containerWidth, height: containerHeight }}
        >
          <div className="inline-block min-w-full">
            {renderRows()}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => contextCell && onInsertRow(contextCell.row)}>
          Insert row above
        </ContextMenuItem>
        <ContextMenuItem onClick={() => contextCell && onInsertRow(contextCell.row + 1)}>
          Insert row below
        </ContextMenuItem>
        <ContextMenuItem onClick={() => contextCell && onDeleteRow(contextCell.row)}>
          Delete row
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => contextCell && onInsertColumn(contextCell.col)}>
          Insert column left
        </ContextMenuItem>
        <ContextMenuItem onClick={() => contextCell && onInsertColumn(contextCell.col + 1)}>
          Insert column right
        </ContextMenuItem>
        <ContextMenuItem onClick={() => contextCell && onDeleteColumn(contextCell.col)}>
          Delete column
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onClearCells}>
          Clear cells
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
