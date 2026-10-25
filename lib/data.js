import 'server-only';
import widgetsJson from '@/data/widgets.json';
import contentJson from '@/data/content.json';
import { supabaseServer } from './supabase-server';
import { PER_PAGE } from './site';

const LIST_COLS = 'slug, name, kind, categories, template, created_at';
const byNewest = (a, b) => (b.created_at > a.created_at ? 1 : b.created_at < a.created_at ? -1 : a.name.localeCompare(b.name));

// every read tries the database first and falls back to the bundled data, so the site keeps working without one
async function fromDb(run) {
  const db = supabaseServer();
  if (!db) return null;
  try { const r = await run(db); return r.error ? (console.error(r.error.message), null) : r; } catch (e) { console.error(e); return null; }
}

export async function listWidgets({ page = 1, cat = '', q = '' } = {}) {
  const from = (page - 1) * PER_PAGE;
  const r = await fromDb(db => {
    let s = db.from('widgets').select(LIST_COLS, { count: 'exact' });
    if (cat) s = s.contains('categories', [cat]);
    if (q) s = s.or(`name.ilike.%${q.replace(/[%,()]/g, '')}%,kind.ilike.%${q.replace(/[%,()]/g, '')}%`);
    return s.order('created_at', { ascending: false }).order('name').range(from, from + PER_PAGE - 1);
  });
  if (r) return { items: r.data, total: r.count ?? r.data.length };
  const ql = q.toLowerCase();
  const all = widgetsJson.filter(w => (!cat || w.categories.includes(cat)) && (!ql || w.name.toLowerCase().includes(ql) || w.kind.toLowerCase().includes(ql))).sort(byNewest);
  return { items: all.slice(from, from + PER_PAGE), total: all.length };
}

export async function getWidget(slug) {
  const r = await fromDb(db => db.from('widgets').select('*').eq('slug', slug).maybeSingle());
  if (r && r.data) return r.data;
  const w = widgetsJson.find(x => x.slug === slug);
  if (!w) return null;
  const svgs = (await import('@/data/widget-svgs.json')).default;
  return { ...w, svg: svgs[slug] };
}

export async function getStats() {
  const r = await fromDb(db => db.from('widgets').select('categories, template'));
  const rows = r ? r.data : widgetsJson;
  const perCat = {};
  rows.forEach(w => w.categories.forEach(c => (perCat[c] = (perCat[c] || 0) + 1)));
  return { total: rows.length, perCat, templates: new Set(rows.map(w => w.template)).size };
}

export async function latestWidgets(n = 8) {
  const r = await fromDb(db => db.from('widgets').select(LIST_COLS).order('created_at', { ascending: false }).order('name').limit(n));
  return r ? r.data : [...widgetsJson].sort(byNewest).slice(0, n);
}

export async function relatedWidgets(w, n = 6) {
  const cat = w.categories[0];
  const r = await fromDb(db => db.from('widgets').select(LIST_COLS).contains('categories', [cat]).neq('slug', w.slug).limit(n));
  return r ? r.data : widgetsJson.filter(x => x.slug !== w.slug && x.categories.includes(cat)).slice(0, n);
}

export async function getContent(table, n = 5) {
  const r = await fromDb(db => db.from(table).select('*').order('date', { ascending: false }).order('id', { ascending: false }).limit(n));
  return r && r.data.length ? r.data : contentJson[table].slice(0, n);
}
