import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  ReactNodeViewProps,
} from "@tiptap/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { Pencil, Eraser, Download, X, Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESET_COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
  "#64748b", "#a16207", "#166534", "#1e3a8a", "#7e22ce",
];

function DrawingComponent(props: ReactNodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);

  const initialData = props.node.attrs.data as string | null;

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = initialData;
    }
  }, [initialData]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(x, y);

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = tool === "eraser" ? 20 : lineWidth;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    props.updateAttributes({ data: dataUrl });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <NodeViewWrapper className="drawing-node">
      <div
        className={`border rounded-lg overflow-hidden ${props.selected ? "ring-2 ring-primary" : ""
          }`}
        style={{ width: "fit-content" }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 p-2 bg-muted/50 border-b flex-wrap">
          {/* Pen */}
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* Eraser */}
          <Button
            variant={tool === "eraser" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>

          {/* Color Picker Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={tool === "eraser"}
                title="Pick color"
              >
                <Pipette className="h-4 w-4" />
                <span
                  className="inline-block w-4 h-4 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: color }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3" side="bottom">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Preset Colors</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-primary scale-110" : "border-border"
                        }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Custom Color</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-8 cursor-pointer rounded border border-border"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{color.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Brush size */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Brush size">
            <span className="text-xs">Size</span>
            <input
              type="range"
              min={1}
              max={20}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-16 h-2 cursor-pointer accent-primary"
              disabled={tool === "eraser"}
            />
            <span className="w-4 text-xs">{lineWidth}</span>
          </div>

          <div className="w-px h-6 bg-border mx-0.5" />

          <Button variant="ghost" size="sm" onClick={clearCanvas} title="Clear canvas">
            Clear
          </Button>

          <Button variant="default" size="sm" onClick={saveDrawing} title="Save to document">
            <Download className="h-4 w-4 mr-1" />
            Save
          </Button>

          <Button variant="ghost" size="sm" onClick={downloadCanvas} title="Download as PNG">
            ↓ PNG
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => props.deleteNode()}
            title="Remove drawing"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="cursor-crosshair block"
          style={{ touchAction: "none" }}
          onMouseDown={(e) => { e.stopPropagation(); startDrawing(e); }}
          onMouseMove={(e) => { e.stopPropagation(); draw(e); }}
          onMouseUp={(e) => { e.stopPropagation(); stopDrawing(); }}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
          onTouchMove={(e) => { e.preventDefault(); draw(e); }}
          onTouchEnd={stopDrawing}
        />
      </div>
    </NodeViewWrapper>
  );
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawing: {
      insertDrawing: (options?: { data?: string | null }) => ReturnType;
    }
  }
}

export const Drawing = Node.create({
  name: "drawing",

  group: "block",

  atom: true,

  selectable: true,

  addAttributes() {
    return {
      data: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "drawing-node" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["drawing-node", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingComponent);
  },

  addCommands() {
    return {
      insertDrawing:
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options,
            });
          },
    };
  },
});