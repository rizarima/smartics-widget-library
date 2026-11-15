import { NextResponse } from 'next/server';
import { getCurrentUser, supabaseServer } from '@/lib/supabase-server';
import { geoFromHeaders } from '@/lib/geo';

// called once right after a successful client-side sign-in (fire-and-forget from AuthForm),
// so we can log who logged in, when, and roughly where from (Vercel's geo headers, no external API).
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { country, city } = geoFromHeaders(req.headers);
  const db = supabaseServer();
  const { error } = await db.from('login_log').insert({ user_id: user.id, user_name: user.name, email: user.email, role: user.role, country, city });
  if (error) console.error('login-log:', error.message);
  return NextResponse.json({ ok: !error });
}
