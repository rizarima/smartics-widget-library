import { NextResponse } from 'next/server';
import { getWidget } from '@/lib/data';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// members and partners only
export async function GET(req, { params }) {
  const db = supabaseServer();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!user) return NextResponse.redirect(new URL(`/login?next=/widgets/${params.slug}`, req.url));
  const w = await getWidget(params.slug);
  if (!w) return new Response('Not found', { status: 404 });
  await db.from('downloads').insert({ widget_slug: w.slug, user_id: user.id });
  return new Response(w.svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Disposition': `attachment; filename="${(w.file_name || w.slug + '.svg').replace(/"/g, '')}"`, 'Cache-Control': 'no-store' },
  });
}
