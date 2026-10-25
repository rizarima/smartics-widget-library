import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// link from the confirmation email
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code'), next = url.searchParams.get('next') || '/';
  const db = supabaseServer();
  if (code && db) await db.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', req.url));
}
