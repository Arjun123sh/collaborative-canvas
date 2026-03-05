import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDocuments, createDocument, deleteDocument, updateDocument, duplicateDocument,
} from "@/lib/documents";
import type { Document } from "@/lib/documents";
import { DocumentCard } from "@/components/DocumentCard";
import {
  Plus, Search, LayoutGrid, List, FileText, Sun, Moon, ArrowUpDown, Loader2, Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortKey = "updatedAt" | "createdAt" | "title";

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filtered = useMemo(() => {
    let docs = documents.filter((d) =>
      d.title.toLowerCase().includes(search.toLowerCase())
    );
    if (sortKey === "title") {
      docs = [...docs].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortKey === "createdAt") {
      docs = [...docs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    // "updatedAt" already sorted by getDocuments()
    return docs;
  }, [documents, search, sortKey]);

  const handleCreate = async (fileType: string = "document") => {
    try {
      const doc = await createDocument(undefined, fileType);
      if (fileType === "spreadsheet") {
        navigate(`/sheet/${doc.id}`);
      } else {
        navigate(`/doc/${doc.id}`);
      }
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleOpen = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc?.file_type === "spreadsheet") {
      navigate(`/sheet/${id}`);
    } else {
      navigate(`/doc/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleRename = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    const newName = prompt("Rename document:", doc.title);
    if (newName && newName.trim()) {
      try {
        const updated = await updateDocument(id, { title: newName.trim() });
        if (updated) {
          setDocuments((prev) => prev.map((d) => d.id === id ? updated : d));
        }
      } catch {
        toast.error("Failed to rename document");
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await duplicateDocument(id);
      if (copy) {
        setDocuments((prev) => [copy, ...prev]);
        toast.success("Document duplicated");
      }
    } catch {
      toast.error("Failed to duplicate document");
    }
  };

  const handleEmojiChange = async (id: string, emoji: string) => {
    try {
      const updated = await updateDocument(id, { emoji });
      if (updated) {
        setDocuments((prev) => prev.map((d) => d.id === id ? updated : d));
      }
    } catch {
      toast.error("Failed to update emoji");
    }
  };

  const SORT_LABELS: Record<SortKey, string> = {
    updatedAt: "Last modified",
    createdAt: "Date created",
    title: "Name (A–Z)",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">DocsFlow</span>
          </div>
          <div className="flex-1" />
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreate("document")} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4" /> Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreate("spreadsheet")} className="gap-2 cursor-pointer">
                <Table2 className="h-4 w-4" /> Spreadsheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search + Sort + View Toggle */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {SORT_LABELS[sortKey]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSortKey(key)}
                  className={sortKey === key ? "bg-accent font-medium" : ""}
                >
                  {SORT_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`p-2 transition-colors ${view === "grid" ? "bg-accent" : "hover:bg-accent/50"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 transition-colors ${view === "list" ? "bg-accent" : "hover:bg-accent/50"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading documents…</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {search ? "No documents found" : "No documents yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {search ? "Try a different search term" : "Create your first document to get started"}
            </p>
            {!search && (
              <Button onClick={() => handleCreate("document")} className="gap-1.5">
                <Plus className="h-4 w-4" /> Create document
              </Button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    view="grid"
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onDuplicate={handleDuplicate}
                    onEmojiChange={handleEmojiChange}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filtered.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    view="list"
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onDuplicate={handleDuplicate}
                    onEmojiChange={handleEmojiChange}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
