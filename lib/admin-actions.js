'use server';
import { revalidatePath } from 'next/cache';
import contentJson from '@/data/content.json';
import { supabaseServer, getCurrentUser } from './supabase-server';
import { supabaseAdmin } from './supabase-admin';
import { bundledWidget, getBundledSvg } from './data';
import { sendWhatsApp, waLink } from './whatsapp';
import { TYPES } from './content-types';
import { SITE_NAME } from './site';

// every action re-checks the role; the database policies check it again
async function admin() {
  const u = await getCurrentUser();
  if (!u || u.role !== 'admin') throw new Error('Khusus admin');
  return supabaseServer();
}
const ROLES = ['partner', 'member', 'admin'];
const fail = e => ({ ok: false, error: e?.message || String(e) });

// ---------- partners ----------
export async function approvePartner(id, origin) {
  try {
    const db = await admin();
    const { data: p, error } = await db.from('profiles').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id).select('full_name, phone').single();
    if (error) throw error;
    const msg = `Halo ${p.full_name || ''}, akun partner Anda di ${SITE_NAME} sudah disetujui. Sekarang Anda bisa login dan mengunduh widget di ${origin}/widgets\n\nTerima kasih.`;
    const sent = await sendWhatsApp(p.phone, msg);
    revalidatePath('/admin', 'layout');
    return { ok: true, sent, waUrl: p.phone ? waLink(p.phone, msg) : null };
  } catch (e) { return fail(e); }
}

export async function setPartnerStatus(id, status) {
  try {
    const db = await admin();
    const { error } = await db.from('profiles').update({ status }).eq('id', id);
    if (error) throw error;
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setRole(id, role) {
  try {
    const db = await admin();
    if (!ROLES.includes(role)) throw new Error('Peran tidak dikenal.');
    if ((await getCurrentUser()).id === id && role !== 'admin') throw new Error('Tidak bisa menurunkan peran akun sendiri.');
    const { error } = await db.from('profiles').update({ role, ...(role !== 'partner' ? { status: 'approved' } : {}) }).eq('id', id);
    if (error) throw error;
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ---------- users (needs SUPABASE_SERVICE_ROLE_KEY) ----------
export async function createUser(u) {
  try {
    const db = await admin();
    if (!u.email || !u.password || u.password.length < 6) throw new Error('Email dan password (minimal 6 karakter) wajib diisi.');
    if (!ROLES.includes(u.role)) throw new Error('Peran tidak dikenal.');
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email: u.email.trim(), password: u.password, email_confirm: true,
      user_metadata: { full_name: u.full_name || '', company: u.company || '', phone: u.phone || '' },
    });
    if (error) throw error;
    // the sign-up trigger made a pending partner profile; set the chosen role
    const { error: e2 } = await db.from('profiles').upsert({
      id: data.user.id, email: data.user.email, full_name: u.full_name || null, company: u.company || null, phone: u.phone || null,
      role: u.role, status: 'approved', approved_at: new Date().toISOString(),
    });
    if (e2) throw e2;
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setUserPassword(id, password) {
  try {
    await admin();
    if (!password || password.length < 6) throw new Error('Password minimal 6 karakter.');
    const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password });
    if (error) throw error;
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteUser(id) {
  try {
    const me = await getCurrentUser();
    await admin();
    if (me.id === id) throw new Error('Tidak bisa menghapus akun sendiri.');
    const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
    if (error) throw error;
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ---------- news / packages / updates ----------
const FIELDS = {
  news: ['date', 'title', 'body', 'image_url'],
  updates: ['date', 'title', 'body', 'image_url'],
  packages: ['date', 'name', 'version', 'template', 'category', 'description', 'body', 'image_url', 'widget_slugs'],
};

export async function saveContent(type, item) {
  try {
    const db = await admin();
    const table = TYPES[type].table;
    const row = {};
    for (const f of FIELDS[table]) if (item[f] !== undefined) row[f] = item[f] === '' ? null : item[f];
    if (!row.date) row.date = new Date().toISOString().slice(0, 10);
    if (table === 'packages') { row.widget_slugs = row.widget_slugs || []; row.count = row.widget_slugs.length; }
    const q = item.id ? db.from(table).update(row).eq('id', item.id) : db.from(table).insert(row);
    const { error } = await q;
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteContent(type, id) {
  try {
    const db = await admin();
    const { error } = await db.from(TYPES[type].table).delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// copies the sample posts into the database so they can be edited
export async function importSampleContent(type) {
  try {
    const db = await admin();
    const table = TYPES[type].table;
    const rows = contentJson[table].map(({ id, ...r }) => { const o = {}; for (const f of FIELDS[table]) if (r[f] !== undefined) o[f] = r[f]; if (table === 'packages') o.count = (o.widget_slugs || []).length; return o; });
    const { error } = await db.from(table).insert(rows);
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ---------- widgets ----------
export async function saveWidget(w) {
  try {
    const db = await admin();
    if (!w.slug || !w.svg || !/<server[\s>]/.test(w.svg)) throw new Error('File bukan widget SmartICS (tidak ada blok <server>).');
    const row = {
      slug: w.slug, name: w.name, kind: w.kind, categories: w.categories, template: w.template, description: w.description,
      properties: w.properties, file_name: w.file_name, svg: w.svg, preview_svg: w.preview_svg, hidden: false, updated_at: new Date().toISOString(),
      ...(w.keepDate ? {} : { created_at: new Date().toISOString().slice(0, 10) }),
    };
    const { error } = await db.from('widgets').upsert(row);
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// edit name/category/description of any widget (a bundled one is copied into the database first)
export async function updateWidgetMeta(slug, patch) {
  try {
    const db = await admin();
    const { data: existing } = await db.from('widgets').select('slug').eq('slug', slug).maybeSingle();
    if (!existing) {
      const b = bundledWidget(slug);
      if (!b) throw new Error('Widget tidak ditemukan');
      const { error } = await db.from('widgets').insert({ ...b, svg: await getBundledSvg(slug), ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else {
      const { error } = await db.from('widgets').update({ ...patch, updated_at: new Date().toISOString() }).eq('slug', slug);
      if (error) throw error;
    }
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteWidget(slug) {
  try {
    const db = await admin();
    const { error } = await db.from('widgets').delete().eq('slug', slug);
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}
