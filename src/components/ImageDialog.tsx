import { useState } from "react";
import { Editor } from "@tiptap/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageDialogProps {
    editor: Editor | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImageDialog({ editor, open, onOpenChange }: ImageDialogProps) {
    const [url, setUrl] = useState("");
    const [alt, setAlt] = useState("");

    const handleInsert = () => {
        if (!url.trim() || !editor) return;
        editor.chain().focus().setImage({ src: url.trim(), alt: alt.trim() || undefined }).run();
        setUrl("");
        setAlt("");
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleInsert();
        if (e.key === "Escape") onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Insert Image</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="img-url">Image URL</Label>
                        <Input
                            id="img-url"
                            placeholder="https://example.com/image.png"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="img-alt">Alt text (optional)</Label>
                        <Input
                            id="img-alt"
                            placeholder="Describe the image..."
                            value={alt}
                            onChange={(e) => setAlt(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    {url && (
                        <div className="rounded-lg border border-border overflow-hidden">
                            <img
                                src={url}
                                alt={alt || "preview"}
                                className="max-h-40 w-full object-contain bg-muted"
                                onError={(e) => (e.currentTarget.style.display = "none")}
                                onLoad={(e) => (e.currentTarget.style.display = "")}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleInsert} disabled={!url.trim()}>
                        Insert
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
