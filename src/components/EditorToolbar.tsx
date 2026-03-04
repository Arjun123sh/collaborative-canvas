import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Image, Table, CheckSquare, Highlighter,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Pencil, Keyboard,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { ImageDialog } from "./ImageDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditorToolbarProps {
  editor: Editor | null;
}

const SHORTCUTS = [
  { keys: "Ctrl + B", desc: "Bold" },
  { keys: "Ctrl + I", desc: "Italic" },
  { keys: "Ctrl + U", desc: "Underline" },
  { keys: "Ctrl + Z", desc: "Undo" },
  { keys: "Ctrl + Y", desc: "Redo" },
  { keys: "Ctrl + S", desc: "Save document" },
  { keys: "Ctrl + `", desc: "Toggle focus mode" },
  { keys: "/", desc: "Slash command menu" },
  { keys: "Ctrl + Shift + H", desc: "Highlight" },
  { keys: "Ctrl + `", desc: "Inline code" },
  { keys: "Ctrl + Shift + B", desc: "Blockquote" },
  { keys: "Tab", desc: "Indent list item" },
  { keys: "Shift + Tab", desc: "Outdent list item" },
  { keys: "Escape", desc: "Exit focus mode / close menus" },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [imgDialogOpen, setImgDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  if (!editor) return null;

  const tools = [
    [
      { icon: Undo2, action: () => editor.chain().focus().undo().run(), active: false, tooltip: "Undo", disabled: !editor.can().undo() },
      { icon: Redo2, action: () => editor.chain().focus().redo().run(), active: false, tooltip: "Redo", disabled: !editor.can().redo() },
    ],
    [
      { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), tooltip: "Bold (Ctrl+B)" },
      { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), tooltip: "Italic (Ctrl+I)" },
      { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), tooltip: "Underline (Ctrl+U)" },
      { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), tooltip: "Strikethrough" },
      { icon: Highlighter, action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive("highlight"), tooltip: "Highlight" },
      { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), tooltip: "Inline code" },
    ],
    [
      { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), tooltip: "Heading 1" },
      { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), tooltip: "Heading 2" },
      { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), tooltip: "Heading 3" },
    ],
    [
      { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), tooltip: "Bullet list" },
      { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), tooltip: "Numbered list" },
      { icon: CheckSquare, action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive("taskList"), tooltip: "Task list" },
    ],
    [
      { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), tooltip: "Blockquote" },
      { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, tooltip: "Divider" },
      {
        icon: Table, action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        active: editor.isActive("table"), tooltip: "Insert table"
      },
      {
        icon: Image,
        action: () => setImgDialogOpen(true),
        active: false,
        tooltip: "Insert image",
      },
      {
        icon: Pencil, action: () => editor.chain().focus().insertDrawing({ data: null }).run(),
        active: false, tooltip: "Add drawing"
      },
    ],
    [
      { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign("left").run(), active: editor.isActive({ textAlign: "left" }), tooltip: "Align left" },
      { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign("center").run(), active: editor.isActive({ textAlign: "center" }), tooltip: "Align center" },
      { icon: AlignRight, action: () => editor.chain().focus().setTextAlign("right").run(), active: editor.isActive({ textAlign: "right" }), tooltip: "Align right" },
    ],
  ];

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center gap-0.5 px-3 py-1.5 bg-toolbar border-b border-toolbar-border overflow-x-auto">
        {tools.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <Separator orientation="vertical" className="mx-1 h-6" />}
            {group.map((tool, ti) => (
              <Tooltip key={ti}>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={tool.active}
                    onPressedChange={tool.action}
                    disabled={"disabled" in tool ? tool.disabled : false}
                    className="h-8 w-8 p-0 data-[state=on]:bg-toolbar-active"
                  >
                    <tool.icon className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {tool.tooltip}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}

        {/* Keyboard shortcuts help */}
        <div className="ml-auto flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={false}
                onPressedChange={() => setShortcutsOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Keyboard className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Keyboard shortcuts
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Image dialog */}
      <ImageDialog editor={editor} open={imgDialogOpen} onOpenChange={setImgDialogOpen} />

      {/* Shortcuts dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {SHORTCUTS.map(({ keys, desc }) => (
              <div key={keys} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">{desc}</span>
                <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
