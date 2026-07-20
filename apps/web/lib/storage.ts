import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const storageClient = createClient(supabaseUrl, serviceRoleKey);

export const BUCKETS = {
  TEMPLATES: "templates",
  ARCHIVIO: "archivio",
} as const;

export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await storageClient.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw error;

  const { data } = storageClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function downloadFile(bucket: string, path: string): Promise<Buffer> {
  const { data, error } = await storageClient.storage.from(bucket).download(path);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  await storageClient.storage.from(bucket).remove([path]);
}

// Estrae il path relativo al bucket dalla URL "pubblica" salvata in DB.
// I bucket sono privati: questa URL non è mai raggiungibile direttamente dal
// browser, serve solo come formato stabile per ricavare bucket+path lato
// server (download sempre via service role, mai esposto al client).
export function pathFromFileUrl(bucket: string, fileUrl: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length);
}
