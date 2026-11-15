import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BUILD_BUCKET } from '@/lib/build-config';

// runs daily (see vercel.json) - deletes expired build ZIPs from Storage to keep the free Supabase
// plan's storage quota from filling up. The widget_builds row itself (who/when/what) is kept forever;
// only the file is removed (zip_path set to null so the UI shows "expired, rebuild to download again").
export async function GET(req) {
  const auth = req.headers.get('authorization');
  const isVercelCron = !!req.headers.get('x-vercel-cron');
  const hasSecret = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = supabaseAdmin();
  const { data: expired, error } = await db.from('widget_builds').select('id, zip_path').eq('status', 'done').not('zip_path', 'is', null).lt('zip_expires_at', new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!expired?.length) return NextResponse.json({ deleted: 0 });

  const paths = expired.map(b => b.zip_path).filter(Boolean);
  if (paths.length) await db.storage.from(BUILD_BUCKET).remove(paths);
  await db.from('widget_builds').update({ zip_path: null }).in('id', expired.map(b => b.id));

  return NextResponse.json({ deleted: expired.length });
}
