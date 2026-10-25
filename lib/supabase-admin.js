import 'server-only';
import { createClient } from '@supabase/supabase-js';

// service-role client for creating/deleting login accounts; only ever used on the server
export const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseAdmin() {
  if (!hasServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi di Vercel, jadi user belum bisa ditambah dari sini.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
