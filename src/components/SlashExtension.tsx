import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Editor } from "@tiptap/react";
import ReactDOM from "react-dom/client";
import React from "react";
import {
    Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
    Quote, Code, Minus, Table, Image, Pencil, Type,
} from "lucide-react";

interface SlashCommand {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    action: (editor: Editor) => void;
}

const COMMANDS: SlashCommand[] = [
    {
        title: "Heading 1",
        description: "Big section heading",
        icon: Heading1,
        action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
        title: "Heading 2",
        description: "Medium section heading",
        icon: Heading2,
        action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
        title: "Heading 3",
        description: "Small section heading",
        icon: Heading3,
        action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
        title: "Paragraph",
        description: "Plain text paragraph",
        icon: Type,
        action: (e) => e.chain().focus().setParagraph().run(),
    },
    {
        title: "Bullet List",
        description: "Unordered list",
        icon: List,
        action: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
        title: "Numbered List",
        description: "Ordered list",
        icon: ListOrdered,
        action: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
        title: "Task List",
        description: "Checkbox list",
        icon: CheckSquare,
        action: (e) => e.chain().focus().toggleTaskList().run(),
    },
    {
        title: "Blockquote",
        description: "Captivating quote",
        icon: Quote,
        action: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
        title: "Code Block",
        description: "Code snippet",
        icon: Code,
        action: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
        title: "Divider",
        description: "Horizontal rule",
        icon: Minus,
        action: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    {
        title: "Table",
        description: "3×3 table",
        icon: Table,
        action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
        title: "Image",
        description: "Embed an image by URL",
        icon: Image,
        action: (e) => {
            const url = window.prompt("Enter image URL:");
            if (url) e.chain().focus().setImage({ src: url }).run();
        },
    },
    {
        title: "Drawing",
        description: "Free-hand canvas drawing",
        icon: Pencil,
        action: (e) => e.chain().focus().insertDrawing({ data: null }).run(),
    },
];

function SlashMenu({
    query,
    editor,
    onClose,
}: {
    query: string;
    editor: Editor;
    onClose: () => void;
}) {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const filtered = React.useMemo(
        () =>
            COMMANDS.filter(
                (c) =>
                    c.title.toLowerCase().includes(query.toLowerCase()) ||
                    c.description.toLowerCase().includes(query.toLowerCase())
            ),
        [query]
    );

    React.useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % filtered.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    runCommand(filtered[selectedIndex]);
                }
            } else if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [filtered, selectedIndex, onClose]);

    const runCommand = (cmd: SlashCommand) => {
        // Delete the slash + query text before running the command
        const { from } = editor.state.selection;
        const queryLength = query.length + 1; // +1 for the slash
        editor
            .chain()
            .focus()
            .deleteRange({ from: from - queryLength, to: from })
            .run();
        cmd.action(editor);
        onClose();
    };

    if (filtered.length === 0) return null;

    return (
        <div className="slash-command-menu">
            {filtered.map((cmd, i) => (
                <button
                    key={cmd.title}
                    className={`slash-command-item w-full text-left ${i === selectedIndex ? "is-selected" : ""}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        runCommand(cmd);
                    }}
                >
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <cmd.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium leading-none mb-0.5">{cmd.title}</p>
                        <p className="text-xs text-muted-foreground">{cmd.description}</p>
                    </div>
                </button>
            ))}
        </div>
    );
}

const slashPluginKey = new PluginKey("slash-commands");

export function createSlashExtension(getEditor: () => Editor | null) {
    let menuContainer: HTMLDivElement | null = null;
    let menuRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;
    let currentQuery = "";
    let isOpen = false;

    const closeMenu = () => {
        if (menuContainer) {
            if (menuRoot) {
                menuRoot.unmount();
                menuRoot = null;
            }
            menuContainer.remove();
            menuContainer = null;
        }
        isOpen = false;
        currentQuery = "";
    };

    const openMenu = (coords: { left: number; bottom: number }, query: string) => {
        const editor = getEditor();
        if (!editor) return;

        if (!menuContainer) {
            menuContainer = document.createElement("div");
            menuContainer.style.position = "fixed";
            menuContainer.style.zIndex = "9999";
            document.body.appendChild(menuContainer);
        }

        menuContainer.style.left = `${coords.left}px`;
        menuContainer.style.top = `${coords.bottom + 4}px`;

        if (!menuRoot) {
            menuRoot = ReactDOM.createRoot(menuContainer);
        }

        menuRoot.render(
            React.createElement(SlashMenu, {
                query,
                editor,
                onClose: closeMenu,
            })
        );

        isOpen = true;
    };

    return Extension.create({
        name: "slashCommands",

        addProseMirrorPlugins() {
            return [
                new Plugin({
                    key: slashPluginKey,
                    view() {
                        return {
                            update(view) {
                                const { state } = view;
                                const { selection } = state;
                                const { from } = selection;

                                if (selection.empty) {
                                    const $pos = state.doc.resolve(from);
                                    const textBefore = $pos.parent.textBetween(
                                        0,
                                        $pos.parentOffset,
                                        null,
                                        "\ufffc"
                                    );

                                    const slashIndex = textBefore.lastIndexOf("/");
                                    if (slashIndex !== -1) {
                                        const query = textBefore.slice(slashIndex + 1);
                                        if (!query.includes(" ")) {
                                            const coords = view.coordsAtPos(from - query.length - 1);
                                            openMenu({ left: coords.left, bottom: coords.bottom }, query);
                                            currentQuery = query;
                                            return;
                                        }
                                    }
                                }

                                if (isOpen) closeMenu();
                            },
                            destroy() {
                                closeMenu();
                            },
                        };
                    },
                }),
            ];
        },
    });
}
