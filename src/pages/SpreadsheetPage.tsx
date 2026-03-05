import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { getDocument, updateDocument } from "@/lib/documents";
import { SpreadsheetEditor } from "@/components/spreadsheet/SpreadsheetEditor";
import { createEmptySpreadsheet, type SpreadsheetData } from "@/lib/spreadsheet-engine";
import { ArrowLeft, Check, Sun, Moon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import type { Document } from "@/lib/documents";

export default function SpreadsheetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [doc, setDoc] = useState<Document | undefined>();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Untitled spreadsheet");
  const [saved, setSaved] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const titleSaveRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getDocument(id).then((d) => {
      if (!d) { navigate("/"); return; }
      setDoc(d);
      setTitle(d.title);
      try {
        const raw = (d as any).spreadsheet_data;
        if (raw && typeof raw === "object" && raw.sheets) {
          setSpreadsheetData(raw as SpreadsheetData);
        } else {
          setSpreadsheetData(createEmptySpreadsheet());
        }
      } catch {
        setSpreadsheetData(createEmptySpreadsheet());
      }
    }).catch(() => navigate("/")).finally(() => setLoading(false));
  }, [id]);

  const handleDataChange = useCallback((data: SpreadsheetData) => {
    if (!id) return;
    // Save spreadsheet_data via document update
    updateDocument(id, { spreadsheet_data: data } as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (titleSaveRef.current) clearTimeout(titleSaveRef.current);
    titleSaveRef.current = setTimeout(() => {
      if (id) updateDocument(id, { title: newTitle });
    }, 600);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading spreadsheet…</span>
        </div>
      </div>
    );
  }

  if (!doc || !spreadsheetData) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-lg z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-lg">📊</span>
        <input
          value={title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent border-none outline-none font-medium text-sm placeholder:text-muted-foreground"
          placeholder="Untitled spreadsheet"
        />
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 text-xs text-success"
            >
              <Check className="h-3.5 w-3.5" /> Saved
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        <SpreadsheetEditor
          initialData={spreadsheetData}
          onDataChange={handleDataChange}
        />
      </div>
    </div>
  );
}
