import { supabase } from "@/integrations/supabase/client";

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  emoji: string;
}

// Shape returned by Supabase (snake_case)
interface DbDocument {
  id: string;
  title: string | null;
  content: string | null;
  emoji: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const EMOJIS = ["📄", "📝", "📋", "📑", "🗒️", "📓", "📔", "📒", "✏️", "🖊️"];

function toDocument(row: DbDocument): Document {
  return {
    id: row.id,
    title: row.title || "Untitled document",
    content: row.content || "",
    emoji: row.emoji || "📄",
    createdAt: new Date(row.created_at || Date.now()),
    updatedAt: new Date(row.updated_at || Date.now()),
  };
}

export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, content, emoji, owner_id, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getDocuments error:", error);
    return [];
  }
  return (data as DbDocument[]).map(toDocument);
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, content, emoji, owner_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("getDocument error:", error);
    return undefined;
  }
  return toDocument(data as DbDocument);
}

export async function createDocument(title?: string): Promise<Document> {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: title || "Untitled document",
      content: "",
      emoji,
      owner_id: null,
    })
    .select("id, title, content, emoji, owner_id, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("createDocument error:", error);
    throw error || new Error("Failed to create document");
  }
  return toDocument(data as DbDocument);
}

export async function updateDocument(
  id: string,
  updates: Partial<Pick<Document, "title" | "content" | "emoji">>
): Promise<Document | undefined> {
  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select("id, title, content, emoji, owner_id, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("updateDocument error:", error);
    return undefined;
  }
  return toDocument(data as DbDocument);
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteDocument error:", error);
    throw error;
  }
}

export async function duplicateDocument(id: string): Promise<Document | undefined> {
  const original = await getDocument(id);
  if (!original) return undefined;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: `${original.title} (Copy)`,
      content: original.content,
      emoji: original.emoji,
      owner_id: null,
    })
    .select("id, title, content, emoji, owner_id, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("duplicateDocument error:", error);
    return undefined;
  }
  return toDocument(data as DbDocument);
}
