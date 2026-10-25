import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function supabaseServer() {
  if (!hasSupabase) return null;
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: list => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a server component */ } },
    },
  });
}

// the signed-in user with their profile, or null
export async function getCurrentUser() {
  const db = supabaseServer();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from('profiles').select('full_name, company, role').eq('id', user.id).maybeSingle();
  const meta = user.user_metadata || {};
  return { id: user.id, email: user.email, name: profile?.full_name || meta.full_name || user.email, company: profile?.company || meta.company || '', role: profile?.role || 'partner' };
}
