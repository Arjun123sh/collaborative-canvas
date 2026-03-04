import { Document } from "@/lib/documents";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Trash2, Pencil, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { EmojiPicker } from "./EmojiPicker";

interface DocumentCardProps {
  document: Document;
  view: "grid" | "list";
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEmojiChange: (id: string, emoji: string) => void;
}

function getPreviewText(html: string, maxLen = 80): string {
  if (!html) return "";
  const div = globalThis.document?.createElement?.("div");
  if (!div) return "";
  div.innerHTML = html;
  const text = div.innerText || div.textContent || "";
  return text.trim().slice(0, maxLen) + (text.trim().length > maxLen ? "…" : "");
}

export function DocumentCard({
  document,
  view,
  onOpen,
  onDelete,
  onRename,
  onDuplicate,
  onEmojiChange,
}: DocumentCardProps) {
  if (view === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => onOpen(document.id)}
      >
        <span
          onClick={(e) => e.stopPropagation()}
          className="text-2xl"
        >
          <EmojiPicker
            current={document.emoji}
            onChange={(em) => onEmojiChange(document.id, em)}
          />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{document.title}</h3>
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          {formatDistanceToNow(document.updatedAt, { addSuffix: true })}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(document.id); }}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(document.id); }}>
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(document.id); }}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    );
  }

  const preview = getPreviewText(document.content);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative flex flex-col rounded-xl border border-border bg-card hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onOpen(document.id)}
    >
      <div className="h-28 bg-muted/50 flex flex-col items-start justify-start border-b border-border p-3 relative overflow-hidden">
        <span
          className="text-3xl mb-1 z-10 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker
            current={document.emoji}
            onChange={(em) => onEmojiChange(document.id, em)}
          />
        </span>
        {preview ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 z-10 relative">
            {preview}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic z-10 relative">Empty document</p>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-medium truncate mb-1">{document.title}</h3>
        <span className="text-xs text-muted-foreground mt-auto">
          Edited {formatDistanceToNow(document.updatedAt, { addSuffix: true })}
        </span>
      </div>
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 bg-card/80 backdrop-blur hover:bg-accent transition-all">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(document.id); }}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(document.id); }}>
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(document.id); }}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
