import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Sparkles, FileText, RefreshCw, Maximize2, Languages, Loader2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIToolbarProps {
  editor: Editor | null;
}

const AI_ACTIONS = [
  { id: "improve", label: "Improve", icon: Sparkles, description: "Polish writing" },
  { id: "summarize", label: "Summarize", icon: FileText, description: "Key points" },
  { id: "rewrite", label: "Professional", icon: RefreshCw, description: "Formal tone" },
  { id: "expand", label: "Expand", icon: Maximize2, description: "Add detail" },
  { id: "translate", label: "Translate", icon: Languages, description: "EN ↔ ES" },
] as const;

export function AIToolbar({ editor }: AIToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const selectedTextRef = useRef("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setVisible(false);
      setResult(null);
      setActiveAction(null);
      return;
    }

    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (selectedText.trim().length < 3) {
      setVisible(false);
      return;
    }
    selectedTextRef.current = selectedText;

    // Get position from the DOM
    const editorElement = editor.view.dom;
    const editorRect = editorElement.getBoundingClientRect();
    const coords = editor.view.coordsAtPos(from);

    setPosition({
      top: coords.top - editorRect.top - 50,
      left: Math.max(0, coords.left - editorRect.left),
    });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", updatePosition);
    return () => {
      editor.off("selectionUpdate", updatePosition);
    };
  }, [editor, updatePosition]);

  const handleAction = async (actionId: string) => {
    if (!editor || loading) return;
    const text = selectedTextRef.current;
    if (!text.trim()) return;

    setLoading(true);
    setActiveAction(actionId);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-writing", {
        body: { text, action: actionId },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        setActiveAction(null);
        return;
      }

      setResult(data.result);
    } catch (err: any) {
      toast.error(err.message || "AI request failed");
      setActiveAction(null);
    } finally {
      setLoading(false);
    }
  };

  const acceptResult = () => {
    if (!editor || !result) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
    setResult(null);
    setVisible(false);
    setActiveAction(null);
    toast.success("AI suggestion applied");
  };

  const rejectResult = () => {
    setResult(null);
    setActiveAction(null);
  };

  if (!visible || !editor) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50"
        style={{ top: position.top, left: position.left }}
      >
        <div className="bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Action buttons */}
          {!result && (
            <div className="flex items-center gap-0.5 p-1.5">
              <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                AI
              </div>
              {AI_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                  title={action.description}
                >
                  {loading && activeAction === action.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <action.icon className="h-3 w-3" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Result preview */}
          {result && (
            <div className="max-w-md">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">AI Suggestion</span>
              </div>
              <div className="px-3 py-2 text-sm max-h-40 overflow-y-auto leading-relaxed">
                {result}
              </div>
              <div className="flex items-center gap-1.5 p-2 border-t border-border">
                <button
                  onClick={acceptResult}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Check className="h-3 w-3" /> Accept
                </button>
                <button
                  onClick={rejectResult}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="h-3 w-3" /> Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
