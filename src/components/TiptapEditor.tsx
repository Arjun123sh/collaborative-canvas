import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import { Table as TableExt } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ImageExt from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Drawing } from "./DrawingExtension";
import { EditorToolbar } from "./EditorToolbar";
import { AIToolbar } from "./AIToolbar";
import { WordCountBar } from "./WordCountBar";
import { createSlashExtension } from "./SlashExtension";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

interface TiptapEditorProps {
  content: string;
  onUpdate: (content: string) => void;
}

export function TiptapEditor({ content, onUpdate }: TiptapEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [focusMode, setFocusMode] = useState(false);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const getEditor = useCallback(() => editorRef.current ?? null, []);

  const SlashCommands = useMemo(() => createSlashExtension(getEditor), []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: "Start writing, or type '/' for commands..." }),
      UnderlineExt,
      TableExt.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      ImageExt.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Drawing,
      SlashCommands,
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(editor.getHTML());
      }, 500);
    },
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none",
      },
    },
  });

  // Keep editorRef in sync
  useEffect(() => {
    (editorRef as any).current = editor;
  }, [editor]);

  // Sync content from outside only on first load
  const initialized = useRef(false);
  useEffect(() => {
    if (editor && content && !initialized.current) {
      editor.commands.setContent(content);
      initialized.current = true;
    }
  }, [editor, content]);

  // Keyboard shortcuts for focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        setFocusMode(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setFocusMode((f) => !f);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusMode]);

  return (
    <div className={`flex flex-col h-full ${focusMode ? "focus-mode" : ""}`}>
      {!focusMode && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto">
        <div
          className={`relative mx-auto px-8 py-8 ${focusMode
            ? "max-w-2xl py-16 px-12"
            : "max-w-3xl"
            }`}
        >
          <AIToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
      </div>
      <WordCountBar
        editor={editor}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode((f) => !f)}
      />
    </div>
  );
}
