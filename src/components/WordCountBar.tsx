import { Editor } from "@tiptap/react";
import { useMemo } from "react";

interface WordCountBarProps {
    editor: Editor | null;
    focusMode: boolean;
    onToggleFocus: () => void;
}

export function WordCountBar({ editor, focusMode, onToggleFocus }: WordCountBarProps) {
    const { words, chars, readingTime } = useMemo(() => {
        if (!editor) return { words: 0, chars: 0, readingTime: 0 };
        const text = editor.state.doc.textContent;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const readingTime = Math.max(1, Math.ceil(words / 200)); // ~200 wpm average
        return { words, chars, readingTime };
    }, [editor?.state.doc]);

    if (!editor) return null;

    return (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-background/70 text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-4">
                <span>{words} {words === 1 ? "word" : "words"}</span>
                <span>{chars} {chars === 1 ? "character" : "characters"}</span>
                <span>{readingTime} min read</span>
            </div>
            <button
                onClick={onToggleFocus}
                className="hover:text-foreground transition-colors"
                title={focusMode ? "Exit focus mode (Esc)" : "Enter focus mode (Ctrl+`)"}
            >
                {focusMode ? "Exit focus mode" : "Focus mode"}
            </button>
        </div>
    );
}
