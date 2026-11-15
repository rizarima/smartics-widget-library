import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseServer, hasSupabase } from './supabase-server';
import { isAdminRole } from './roles';

// for admin pages (admin and superadmin): the database client, or a redirect when the visitor is not an admin
export async function requireAdmin(path = '/admin') {
  if (!hasSupabase) return { db: null, user: null, reason: 'nodb' };
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${path}`);
  if (!isAdminRole(user.role)) return { db: null, user, reason: 'notadmin' };
  return { db: supabaseServer(), user };
}
