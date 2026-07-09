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
