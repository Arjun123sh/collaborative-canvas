import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EMOJI_LIST = [
    "📄", "📝", "📋", "📑", "🗒️", "📓", "📔", "📒", "✏️", "🖊️",
    "📖", "📚", "📗", "📘", "📙", "🗂️", "📁", "📂", "🗃️", "🗄️",
    "💡", "🔍", "🔎", "📌", "📍", "🔖", "🏷️", "🎯", "⭐", "🌟",
    "🚀", "💼", "🏢", "🌐", "💻", "⌨️", "🖥️", "📊", "📈", "📉",
    "🎓", "🏆", "🥇", "🎨", "🎭", "🎪", "🎬", "🎤", "🎵", "🎶",
    "🤖", "👾", "🧠", "💭", "💬", "📣", "📢", "🔔", "💡", "🔋",
    "🌈", "☀️", "🌙", "⚡", "❄️", "🌊", "🔥", "🌱", "🌸", "🍀",
];

interface EmojiPickerProps {
    current: string;
    onChange: (emoji: string) => void;
}

export function EmojiPicker({ current, onChange }: EmojiPickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="text-lg hover:bg-accent p-1 rounded transition-colors cursor-pointer"
                    title="Change emoji"
                >
                    {current}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" side="bottom">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Pick an emoji</p>
                <div className="grid grid-cols-10 gap-0.5">
                    {EMOJI_LIST.map((em) => (
                        <button
                            key={em}
                            onClick={() => onChange(em)}
                            className={`text-base p-1 rounded hover:bg-accent transition-colors ${em === current ? "bg-accent ring-2 ring-primary" : ""
                                }`}
                        >
                            {em}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
