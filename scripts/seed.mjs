// Upload widgets + dashboard content to Supabase.
// usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const read = f => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));

const widgets = read('widgets.json'), svgs = read('widget-svgs.json'), content = read('content.json');
const rows = widgets.map(w => ({ ...w, svg: svgs[w.slug] }));
for (let i = 0; i < rows.length; i += 20) {
  const { error } = await db.from('widgets').upsert(rows.slice(i, i + 20));
  if (error) throw error;
}
console.log('widgets:', rows.length);
for (const t of ['updates', 'packages', 'news']) {
  const { count } = await db.from(t).select('*', { count: 'exact', head: true });
  if (count) { console.log(t + ': already filled, skipped'); continue; }
  const { error } = await db.from(t).insert(content[t].map(({ id, ...r }) => r));
  if (error) throw error;
  console.log(t + ':', content[t].length);
}
