import { supabaseServer } from '@/lib/supabase-server';

// keeps a copy of every WhatsApp request in the database (if one is connected)
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const clip = v => String(v || '').slice(0, 200);
  const db = supabaseServer();
  if (db) await db.from('widget_requests').insert({ widget_slug: clip(b.slug), name: clip(b.name), email: clip(b.email), company: clip(b.company) });
  return Response.json({ ok: true });
}
