import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req) {
  const db = supabaseServer();
  if (db) await db.auth.signOut();
  return NextResponse.redirect(new URL('/', req.url), { status: 303 });
}
