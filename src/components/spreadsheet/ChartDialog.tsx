import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type ChartType = "bar" | "line" | "pie";

const CHART_COLORS = [
  "hsl(217, 91%, 50%)", "hsl(142, 71%, 45%)", "hsl(25, 95%, 53%)",
  "hsl(262, 83%, 58%)", "hsl(0, 72%, 51%)", "hsl(47, 100%, 50%)",
];

interface Props {
  open: boolean;
  onClose: () => void;
  getDisplayValue: (col: number, row: number) => string;
  selectionRange: { startCol: number; startRow: number; endCol: number; endRow: number };
}

export function ChartDialog({ open, onClose, getDisplayValue, selectionRange }: Props) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [chartTitle, setChartTitle] = useState("Chart");

  const minCol = Math.min(selectionRange.startCol, selectionRange.endCol);
  const maxCol = Math.max(selectionRange.startCol, selectionRange.endCol);
  const minRow = Math.min(selectionRange.startRow, selectionRange.endRow);
  const maxRow = Math.max(selectionRange.startRow, selectionRange.endRow);

  // Build data from selection
  const buildData = () => {
    const data: Record<string, string | number>[] = [];
    // Use first row as headers if text, otherwise generate labels
    const headers: string[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      const val = getDisplayValue(c, minRow);
      headers.push(val || `Col ${c - minCol + 1}`);
    }

    const dataStartRow = isNaN(Number(getDisplayValue(minCol, minRow))) ? minRow + 1 : minRow;

    for (let r = dataStartRow; r <= maxRow; r++) {
      const entry: Record<string, string | number> = {};
      for (let c = minCol; c <= maxCol; c++) {
        const key = headers[c - minCol];
        const val = getDisplayValue(c, r);
        const num = Number(val);
        entry[key] = isNaN(num) ? val : num;
      }
      if (!entry[headers[0]]) {
        entry[headers[0]] = `Row ${r - dataStartRow + 1}`;
      }
      data.push(entry);
    }
    return { data, headers };
  };

  const { data, headers } = buildData();
  const labelKey = headers[0];
  const valueKeys = headers.slice(1);

  const renderChart = () => {
    if (data.length === 0) {
      return <p className="text-center text-muted-foreground text-sm py-8">Select data range first</p>;
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Pie - use first value column
    const pieKey = valueKeys[0] ?? labelKey;
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={pieKey}
            nameKey={labelKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={(entry) => entry[labelKey]}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Chart</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <Label className="text-xs">Title</Label>
            <Input value={chartTitle} onChange={(e) => setChartTitle(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="w-32">
            <Label className="text-xs">Type</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">{chartTitle}</h4>
          {renderChart()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
