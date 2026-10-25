import 'server-only';
import { cache } from 'react';
import widgetsJson from '@/data/widgets.json';
import contentJson from '@/data/content.json';
import { supabaseServer } from './supabase-server';
import { PER_PAGE } from './site';

const META = 'slug, name, kind, categories, template, description, properties, file_name, created_at, hidden, updated_at';
const byNewest = (a, b) => (b.created_at > a.created_at ? 1 : b.created_at < a.created_at ? -1 : a.name.localeCompare(b.name));

async function fromDb(run) {
  const db = supabaseServer();
  if (!db) return null;
  try { const r = await run(db); return r.error ? (console.error(r.error.message), null) : r; } catch (e) { console.error(e); return null; }
}

// bundled widgets + widgets uploaded by the admin (a database row replaces the bundled one with the same slug)
export const allWidgets = cache(async (includeHidden = false) => {
  const map = new Map(widgetsJson.map(w => [w.slug, { ...w, source: 'bawaan', thumb: `/previews/${w.slug}.svg` }]));
  const r = await fromDb(db => db.from('widgets').select(META));
  for (const w of r?.data || []) map.set(w.slug, { ...w, source: map.has(w.slug) ? 'diubah' : 'upload', thumb: `/api/widgets/${w.slug}/preview?v=${encodeURIComponent(w.updated_at || '')}` });
  return [...map.values()].filter(w => includeHidden || !w.hidden).sort(byNewest);
});

export async function listWidgets({ page = 1, cat = '', q = '' } = {}) {
  const ql = q.toLowerCase();
  const all = (await allWidgets()).filter(w => (!cat || w.categories.includes(cat)) && (!ql || w.name.toLowerCase().includes(ql) || (w.kind || '').toLowerCase().includes(ql)));
  const from = (page - 1) * PER_PAGE;
  return { items: all.slice(from, from + PER_PAGE), total: all.length };
}

export async function getWidget(slug) {
  const r = await fromDb(db => db.from('widgets').select('*').eq('slug', slug).maybeSingle());
  if (r?.data) return r.data.hidden ? null : r.data;
  const w = widgetsJson.find(x => x.slug === slug);
  if (!w) return null;
  return { ...w, svg: await getBundledSvg(slug) };
}

export const bundledWidget = slug => widgetsJson.find(x => x.slug === slug) || null;
export async function getBundledSvg(slug) {
  return (await import('@/data/widget-svgs.json')).default[slug] || null;
}

export async function getStats() {
  const rows = await allWidgets();
  const perCat = {};
  rows.forEach(w => w.categories.forEach(c => (perCat[c] = (perCat[c] || 0) + 1)));
  return { total: rows.length, perCat };
}

export async function latestWidgets(n = 8) { return (await allWidgets()).slice(0, n); }

export async function relatedWidgets(w, n = 6) {
  return (await allWidgets()).filter(x => x.slug !== w.slug && x.categories.includes(w.categories[0])).slice(0, n);
}

export async function widgetsBySlugs(slugs) {
  const all = await allWidgets();
  return (slugs || []).map(s => all.find(w => w.slug === s)).filter(Boolean);
}

// news / packages / updates: the database once it has rows, otherwise the bundled content
export async function getContent(table, n = 100) {
  const r = await fromDb(db => db.from(table).select('*').order('date', { ascending: false }).order('id', { ascending: false }).limit(n));
  return r && r.data.length ? r.data : contentJson[table].slice(0, n);
}

export async function getContentItem(table, id) {
  const r = await fromDb(db => db.from(table).select('id').limit(1));
  if (r && r.data.length) {
    const one = await fromDb(db => db.from(table).select('*').eq('id', id).maybeSingle());
    return one?.data || null;
  }
  return contentJson[table].find(x => String(x.id) === String(id)) || null;
}
