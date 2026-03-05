import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { SheetData } from "@/lib/spreadsheet-engine";

interface Props {
  sheets: SheetData[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onAddSheet: () => void;
  onRemoveSheet: (id: string) => void;
  onRenameSheet: (id: string, name: string) => void;
}

export function SheetTabs({
  sheets, activeSheetId, onSelectSheet, onAddSheet, onRemoveSheet, onRenameSheet,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRenameSheet(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-t border-border bg-muted/50 overflow-x-auto">
      {sheets.map((sheet) => (
        <div
          key={sheet.id}
          className={`group flex items-center gap-1 px-3 py-1 rounded-t text-xs cursor-pointer select-none transition-colors
            ${sheet.id === activeSheetId
              ? "bg-card text-foreground border border-b-0 border-border -mb-px"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          onClick={() => onSelectSheet(sheet.id)}
          onDoubleClick={() => startRename(sheet.id, sheet.name)}
        >
          {editingId === sheet.id ? (
            <input
              className="w-20 text-xs bg-transparent border-none outline-none"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={commitRename}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{sheet.name}</span>
          )}
          {sheets.length > 1 && (
            <button
              className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              onClick={(e) => { e.stopPropagation(); onRemoveSheet(sheet.id); }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <button
        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        onClick={onAddSheet}
        title="Add sheet"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
