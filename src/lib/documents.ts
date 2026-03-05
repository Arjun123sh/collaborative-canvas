import { supabase } from "@/integrations/supabase/client";

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  emoji: string;
  file_type: string;
  spreadsheet_data?: any;
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
  file_type: string | null;
  spreadsheet_data: any;
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
    file_type: row.file_type || "document",
    spreadsheet_data: row.spreadsheet_data,
  };
}

export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, content, emoji, owner_id, created_at, updated_at, file_type, spreadsheet_data")
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
    .select("id, title, content, emoji, owner_id, created_at, updated_at, file_type, spreadsheet_data")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("getDocument error:", error);
    return undefined;
  }
  return toDocument(data as DbDocument);
}

export async function createDocument(title?: string, fileType: string = "document"): Promise<Document> {
  const emoji = fileType === "spreadsheet" ? "📊" : EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: title || (fileType === "spreadsheet" ? "Untitled spreadsheet" : "Untitled document"),
      content: "",
      emoji,
      owner_id: user?.id ?? "",
      file_type: fileType,
    } as any)
    .select("id, title, content, emoji, owner_id, created_at, updated_at, file_type, spreadsheet_data")
    .single();

  if (error || !data) {
    console.error("createDocument error:", error);
    throw error || new Error("Failed to create document");
  }
  return toDocument(data as DbDocument);
}

export async function updateDocument(
  id: string,
  updates: Partial<Pick<Document, "title" | "content" | "emoji" | "spreadsheet_data">>
): Promise<Document | undefined> {
  const { data, error } = await supabase
    .from("documents")
    .update(updates as any)
    .eq("id", id)
    .select("id, title, content, emoji, owner_id, created_at, updated_at, file_type, spreadsheet_data")
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

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: `${original.title} (Copy)`,
      content: original.content,
      emoji: original.emoji,
      owner_id: user?.id ?? "",
      file_type: original.file_type,
      spreadsheet_data: original.spreadsheet_data,
    } as any)
    .select("id, title, content, emoji, owner_id, created_at, updated_at, file_type, spreadsheet_data")
    .single();

  if (error || !data) {
    console.error("duplicateDocument error:", error);
    return undefined;
  }
  return toDocument(data as DbDocument);
}
