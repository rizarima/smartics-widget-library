import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// link from the confirmation email
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code'), next = url.searchParams.get('next') || '/';
  const db = supabaseServer();
  if (code && db) {
    const { data } = await db.auth.exchangeCodeForSession(code);
    // after an email change: the trigger copies the new login email into the profile
    if (data?.user) await db.from('profiles').update({ email: data.user.email }).eq('id', data.user.id);
  }
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', req.url));
}
