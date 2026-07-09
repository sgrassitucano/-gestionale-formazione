import { createClient } from "@supabase/supabase-js";
import { type SessionUser } from "@gestionale/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getSession(): Promise<SessionUser | null> {
  // TODO: Implement session retrieval from JWT cookie
  // Return user info if valid session exists
  return null;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: SessionUser; token: string } | null> {
  // TODO: Implement login via Supabase auth
  return null;
}

export async function logoutUser(): Promise<void> {
  // TODO: Implement logout (clear session cookie, call Supabase logout)
}
