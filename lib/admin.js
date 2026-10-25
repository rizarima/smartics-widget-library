import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseServer, hasSupabase } from './supabase-server';

// for admin pages: the database client, or a redirect when the visitor is not an admin
export async function requireAdmin(path = '/admin') {
  if (!hasSupabase) return { db: null, user: null, reason: 'nodb' };
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${path}`);
  if (user.role !== 'admin') return { db: null, user, reason: 'notadmin' };
  return { db: supabaseServer(), user };
}
