import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

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

// the signed-in user with their profile, or null (once per request)
export const getCurrentUser = cache(async () => {
  const db = supabaseServer();
  if (!db) return null;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;
    const { data: p } = await db.from('profiles').select('full_name, company, phone, role, status').eq('id', user.id).maybeSingle();
    const meta = user.user_metadata || {};
    const role = p?.role || 'partner';
    const status = role === 'partner' ? p?.status || 'pending' : 'approved';
    return { id: user.id, email: user.email, name: p?.full_name || meta.full_name || user.email, company: p?.company || meta.company || '', phone: p?.phone || '', role, status };
  } catch { return null; }
});

// members and admins always, partners once an admin approved them
export const canDownload = u => !!u && (u.role !== 'partner' || u.status === 'approved');
