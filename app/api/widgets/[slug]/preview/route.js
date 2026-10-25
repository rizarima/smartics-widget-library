import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// thumbnail of an uploaded widget; bundled widgets use /previews/<slug>.svg
export async function GET(req, { params }) {
  const db = supabaseServer();
  const r = db ? await db.from('widgets').select('preview_svg').eq('slug', params.slug).maybeSingle() : null;
  if (!r?.data?.preview_svg) return NextResponse.redirect(new URL(`/previews/${params.slug}.svg`, req.url));
  return new Response(r.data.preview_svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=86400' } });
}
