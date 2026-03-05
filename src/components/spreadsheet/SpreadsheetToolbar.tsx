import {
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, DollarSign, Percent, Hash, Calendar,
  Download, Upload, BarChart3, Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { CellFormat } from "@/lib/spreadsheet-engine";

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];

const COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  "#ff0000", "#ff6600", "#ffcc00", "#33cc33", "#3366ff", "#9933ff",
  "#ff3366", "#ff9933", "#ffff33", "#66ff66", "#66ccff", "#cc66ff",
  "#cc0000", "#cc6600", "#cccc00", "#009900", "#0033cc", "#6600cc",
];

interface Props {
  currentFormat: CellFormat;
  formulaBarValue: string;
  selectedCellRef: string;
  onFormatChange: (format: Partial<CellFormat>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onImport: () => void;
  onExportXlsx: () => void;
  onExportCsv: () => void;
  onCreateChart: () => void;
  onFormulaBarChange: (value: string) => void;
  onFormulaBarSubmit: () => void;
}

export function SpreadsheetToolbar({
  currentFormat,
  formulaBarValue,
  selectedCellRef,
  onFormatChange,
  onUndo,
  onRedo,
  onImport,
  onExportXlsx,
  onExportCsv,
  onCreateChart,
  onFormulaBarChange,
  onFormulaBarSubmit,
}: Props) {
  return (
    <div className="border-b border-border bg-card">
      {/* Action bar */}
      <div className="flex items-center gap-1 px-2 py-1 flex-wrap">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUndo} title="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRedo} title="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Font size */}
        <Select
          value={String(currentFormat.fontSize ?? 12)}
          onValueChange={(v) => onFormatChange({ fontSize: Number(v) })}
        >
          <SelectTrigger className="h-7 w-16 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button
          variant={currentFormat.bold ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => onFormatChange({ bold: !currentFormat.bold })}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentFormat.italic ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => onFormatChange({ italic: !currentFormat.italic })}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Text color">
              <Type className="h-3.5 w-3.5" />
              <div
                className="absolute bottom-0.5 left-1 right-1 h-0.5 rounded-full"
                style={{ backgroundColor: currentFormat.textColor ?? "#000" }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => onFormatChange({ textColor: c })}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Background color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Fill color">
              <div
                className="h-3.5 w-3.5 rounded border border-border"
                style={{ backgroundColor: currentFormat.bgColor ?? "transparent" }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-6 gap-1">
              <button
                className="h-6 w-6 rounded border border-border bg-background hover:scale-110 transition-transform text-xs"
                onClick={() => onFormatChange({ bgColor: undefined })}
                title="No fill"
              >✕</button>
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => onFormatChange({ bgColor: c })}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Alignment */}
        <Button
          variant={currentFormat.align === "left" || !currentFormat.align ? "secondary" : "ghost"}
          size="icon" className="h-7 w-7"
          onClick={() => onFormatChange({ align: "left" })}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentFormat.align === "center" ? "secondary" : "ghost"}
          size="icon" className="h-7 w-7"
          onClick={() => onFormatChange({ align: "center" })}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentFormat.align === "right" ? "secondary" : "ghost"}
          size="icon" className="h-7 w-7"
          onClick={() => onFormatChange({ align: "right" })}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Number format */}
        <Button
          variant={currentFormat.numberFormat === "number" ? "secondary" : "ghost"}
          size="icon" className="h-7 w-7" title="Number"
          onClick={() => onFormatChange({ numberFormat: "number" })}
        >
          <Hash className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentFormat.numberFormat === "currency" ? "secondary" : "ghost"}
          size="icon" className="h-7 w-7" title="Currency"
          onClick={() => onFormatChange({ numberFormat: "currency" })}
        >
          <DollarSign className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentFormat.numberFormat === "percentage" ? "secondary" : "ghost"}
          size="icon" className="h-7 w-7" title="Percentage"
          onClick={() => onFormatChange({ numberFormat: "percentage" })}
        >
          <Percent className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentFormat.numberFormat === "date" ? "secondary" : "ghost"}
          size="icon" className="h-7 w-7" title="Date"
          onClick={() => onFormatChange({ numberFormat: "date" })}
        >
          <Calendar className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        {/* Import/Export */}
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onImport}>
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onExportXlsx}>
          <Download className="h-3.5 w-3.5" /> XLSX
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onExportCsv}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onCreateChart}>
          <BarChart3 className="h-3.5 w-3.5" /> Chart
        </Button>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-t border-border">
        <span className="text-xs font-mono text-muted-foreground w-12 text-center bg-muted rounded px-1 py-0.5 shrink-0">
          {selectedCellRef}
        </span>
        <span className="text-xs text-muted-foreground">fx</span>
        <input
          className="flex-1 h-6 text-xs font-mono bg-transparent border-none outline-none"
          value={formulaBarValue}
          onChange={(e) => onFormulaBarChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onFormulaBarSubmit();
            if (e.key === "Escape") onFormulaBarChange("");
          }}
          placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
        />
      </div>
    </div>
  );
}
