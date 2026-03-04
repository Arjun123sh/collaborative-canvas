import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { getDocument, updateDocument } from "@/lib/documents";
import { TiptapEditor } from "@/components/TiptapEditor";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { ArrowLeft, Check, Download, FileText, FileCode, Sun, Moon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import type { Document } from "@/lib/documents";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [doc, setDoc] = useState<Document | undefined>();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Untitled document");
  const [saved, setSaved] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const contentRef = useRef("");
  const titleSaveRef = useRef<ReturnType<typeof setTimeout>>();

  // Load document from Supabase on mount
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getDocument(id).then((d) => {
      if (!d) { navigate("/"); return; }
      setDoc(d);
      setTitle(d.title);
      contentRef.current = d.content;
    }).catch(() => {
      navigate("/");
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  // Ctrl+S shortcut: force save + show indicator
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (id) {
          updateDocument(id, { content: contentRef.current });
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [id]);

  const handleContentUpdate = useCallback((content: string) => {
    if (!id) return;
    contentRef.current = content;
    updateDocument(id, { content });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Debounce title save to Supabase
    if (titleSaveRef.current) clearTimeout(titleSaveRef.current);
    titleSaveRef.current = setTimeout(() => {
      if (id) updateDocument(id, { title: newTitle });
    }, 600);
  };

  const exportAsHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; margin-bottom: 0.4em; }
    h3 { font-size: 1.25em; margin-bottom: 0.3em; }
    p { margin: 0.75em 0; }
    ul, ol { margin: 0.75em 0; padding-left: 1.5em; }
    blockquote { border-left: 3px solid #d1d5db; margin-left: 0; padding-left: 1em; color: #6b7280; }
    code { background: #f3f4f6; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1em; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; }
    mark { background: #fef08a; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${contentRef.current}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    const temp = document.createElement("div");
    temp.innerHTML = contentRef.current;

    const htmlToMd = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
      const el = node as HTMLElement;
      const children = Array.from(el.childNodes).map(htmlToMd).join("");
      switch (el.tagName?.toLowerCase()) {
        case "h1": return `# ${children}\n\n`;
        case "h2": return `## ${children}\n\n`;
        case "h3": return `### ${children}\n\n`;
        case "p": return `${children}\n\n`;
        case "strong": case "b": return `**${children}**`;
        case "em": case "i": return `*${children}*`;
        case "u": return `__${children}__`;
        case "s": return `~~${children}~~`;
        case "code": return `\`${children}\``;
        case "pre": return `\`\`\`\n${el.textContent}\n\`\`\`\n\n`;
        case "blockquote": return `> ${children}\n\n`;
        case "ul": return `${children}\n`;
        case "ol": return `${children}\n`;
        case "li": return `- ${children}\n`;
        case "br": return `\n`;
        case "hr": return `---\n\n`;
        case "mark": return `==${children}==`;
        case "a": return `[${children}](${el.getAttribute("href") || ""})`;
        case "img": return `![${el.getAttribute("alt") || ""}](${el.getAttribute("src") || ""})\n\n`;
        case "table": return `${children}\n`;
        case "tr": return `| ${children} |\n`;
        case "th": case "td": return `${children} |`;
        default: return children;
      }
    };

    const md = `# ${title}\n\n${htmlToMd(temp)}`.replace(/\n{3,}/g, "\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPlainText = () => {
    const temp = document.createElement("div");
    temp.innerHTML = contentRef.current;
    const text = `${title}\n${"=".repeat(title.length)}\n\n${temp.innerText}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups for PDF export.");
      return;
    }
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; } h3 { font-size: 1.25em; }
    p { margin: 0.8em 0; }
    ul, ol { margin: 0.8em 0; padding-left: 1.5em; }
    blockquote { border-left: 3px solid #d1d5db; margin-left: 0; padding-left: 1em; color: #6b7280; }
    code { background: #f3f4f6; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.85em; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1em; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; }
    th { background: #f9fafb; }
    img { max-width: 100%; height: auto; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${contentRef.current}
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  // Show loading state while fetching doc
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading document…</span>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-lg z-20">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-lg">{doc.emoji}</span>
        <input
          value={title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent border-none outline-none font-medium text-sm placeholder:text-muted-foreground"
          placeholder="Untitled document"
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

        {/* Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Export As</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={exportAsPDF} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-red-500" />
              PDF (Print)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsHTML} className="gap-2 cursor-pointer">
              <FileCode className="h-4 w-4 text-orange-500" />
              HTML File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsMarkdown} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-blue-500" />
              Markdown (.md)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsPlainText} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-gray-500" />
              Plain Text (.txt)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Editor + Chat Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TiptapEditor content={doc.content} onUpdate={handleContentUpdate} />
        </div>
        <AIChatSidebar
          open={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
          documentContent={contentRef.current}
        />
      </div>
    </div>
  );
}
