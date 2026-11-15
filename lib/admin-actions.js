'use server';
import { revalidatePath } from 'next/cache';
import contentJson from '@/data/content.json';
import { supabaseServer, getCurrentUser } from './supabase-server';
import { supabaseAdmin } from './supabase-admin';
import { bundledWidget, getBundledSvg } from './data';
import { sendWhatsApp, waLink } from './whatsapp';
import { TYPES } from './content-types';
import { SITE_NAME } from './site';
import { ROLES, ROLE_LABEL, isAdminRole, assignableRoles, canManageAccount } from './roles';
import { publicImageUrl } from './images';
import { audit, diff, removeImage } from './audit';

// every action re-checks the role; the database policies check it again
async function admin() {
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) throw new Error('Khusus admin');
  return { db: supabaseServer(), me };
}
const fail = e => ({ ok: false, error: e?.message || String(e) });
const who = p => p?.full_name || p?.email || '?';

async function target(db, id) {
  const { data, error } = await db.from('profiles').select('id, email, full_name, phone, role, status, avatar_path').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Akun tidak ditemukan.');
  return data;
}
function mustManage(me, t) {
  if (!canManageAccount(me, t)) throw new Error('Hanya superadmin yang bisa mengatur akun admin dan superadmin.');
}

// ---------- partners ----------
export async function approvePartner(id, origin) {
  try {
    const { db, me } = await admin();
    const { data: p, error } = await db.from('profiles').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id).select('full_name, email, phone').single();
    if (error) throw error;
    const msg = `Halo ${p.full_name || ''}, akun partner Anda di ${SITE_NAME} sudah disetujui. Sekarang Anda bisa login dan mengunduh widget di ${origin}/widgets\n\nTerima kasih.`;
    const sent = await sendWhatsApp(p.phone, msg);
    await audit(db, me, 'partner.approve', 'user', id, `${who(p)} (${p.email})`);
    revalidatePath('/admin', 'layout');
    return { ok: true, sent, waUrl: p.phone ? waLink(p.phone, msg) : null };
  } catch (e) { return fail(e); }
}

export async function setPartnerStatus(id, status) {
  try {
    const { db, me } = await admin();
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new Error('Status tidak dikenal.');
    const t = await target(db, id);
    mustManage(me, t);
    const { error } = await db.from('profiles').update({ status }).eq('id', id);
    if (error) throw error;
    await audit(db, me, status === 'rejected' ? (t.status === 'approved' ? 'partner.revoke' : 'partner.reject') : 'partner.approve', 'user', id, `${who(t)} (${t.email})`, { status: [t.status, status] });
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setRole(id, role) {
  try {
    const { db, me } = await admin();
    if (!assignableRoles(me.role).includes(role)) throw new Error('Anda tidak bisa memberi peran ini.');
    if (me.id === id) throw new Error('Tidak bisa mengubah peran akun sendiri.');
    const t = await target(db, id);
    mustManage(me, t);
    const { error } = await db.from('profiles').update({ role, ...(role !== 'partner' ? { status: 'approved' } : {}) }).eq('id', id);
    if (error) throw error;
    await audit(db, me, 'user.role', 'user', id, `${who(t)}: ${ROLE_LABEL[t.role] || t.role} → ${ROLE_LABEL[role]}`, { role: [t.role, role] });
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ---------- users (needs SUPABASE_SERVICE_ROLE_KEY) ----------
export async function createUser(u) {
  try {
    const { db, me } = await admin();
    if (!u.email || !u.password || u.password.length < 6) throw new Error('Email dan password (minimal 6 karakter) wajib diisi.');
    if (!ROLES.includes(u.role) || !assignableRoles(me.role).includes(u.role)) throw new Error('Anda tidak bisa memberi peran ini.');
    const sa = supabaseAdmin();
    const { data, error } = await sa.auth.admin.createUser({
      email: u.email.trim(), password: u.password, email_confirm: true,
      user_metadata: { full_name: u.full_name || '', company: u.company || '', phone: u.phone || '' },
    });
    if (error) throw error;
    // the sign-up trigger made a pending partner profile; set the chosen role (role rules were checked above)
    const { error: e2 } = await sa.from('profiles').upsert({
      id: data.user.id, email: data.user.email, full_name: u.full_name || null, company: u.company || null, phone: u.phone || null,
      role: u.role, status: 'approved', approved_at: new Date().toISOString(),
    });
    if (e2) throw e2;
    await audit(db, me, 'user.create', 'user', data.user.id, `${u.full_name || u.email} (${u.email}) sebagai ${ROLE_LABEL[u.role]}`);
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setUserPassword(id, password) {
  try {
    const { db, me } = await admin();
    if (!password || password.length < 6) throw new Error('Password minimal 6 karakter.');
    const t = await target(db, id);
    mustManage(me, t);
    const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password });
    if (error) throw error;
    await audit(db, me, 'user.password', 'user', id, `${who(t)} (${t.email})`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteUser(id) {
  try {
    const { db, me } = await admin();
    if (me.id === id) throw new Error('Tidak bisa menghapus akun sendiri.');
    const t = await target(db, id);
    mustManage(me, t);
    const sa = supabaseAdmin();
    const { error } = await sa.auth.admin.deleteUser(id);
    if (error) throw error;
    await removeImage(sa, t.avatar_path);
    await audit(db, me, 'user.delete', 'user', id, `${who(t)} (${t.email}), peran ${ROLE_LABEL[t.role] || t.role}`);
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ---------- news / packages / updates ----------
const FIELDS = {
  news: ['date', 'title', 'body'],
  updates: ['date', 'title', 'body'],
  packages: ['date', 'name', 'version', 'template', 'category', 'description', 'body', 'widget_slugs'],
};

// item.image_path: a file the browser just uploaded to Storage (<type>/...); item.removeImage: drop the cover
export async function saveContent(type, item) {
  try {
    const { db, me } = await admin();
    const table = TYPES[type].table;
    const row = {};
    for (const f of FIELDS[table]) if (item[f] !== undefined) row[f] = item[f] === '' ? null : item[f];
    if (!row.date) row.date = new Date().toISOString().slice(0, 10);
    if (table === 'packages') { row.widget_slugs = row.widget_slugs || []; row.count = row.widget_slugs.length; }
    if (item.image_path) {
      if (!item.image_path.startsWith(type + '/') || item.image_path.includes('..')) throw new Error('Lokasi gambar tidak valid.');
      row.image_path = item.image_path;
      row.image_url = publicImageUrl(item.image_path);
    } else if (item.removeImage) {
      row.image_path = null;
      row.image_url = null;
    }
    let old = null, id = item.id;
    if (id) {
      const { data } = await db.from(table).select('*').eq('id', id).maybeSingle();
      old = data;
      if (!old) throw new Error('Data tidak ditemukan (mungkin sudah dihapus).');
      const { error } = await db.from(table).update(row).eq('id', id);
      if (error) throw error;
    } else {
      const { data, error } = await db.from(table).insert(row).select('id').single();
      if (error) throw error;
      id = data.id;
    }
    // the replaced or removed cover is deleted from Storage
    if (old?.image_path && 'image_path' in row && old.image_path !== row.image_path) await removeImage(db, old.image_path);
    const title = row.title || row.name;
    await audit(db, me, old ? 'content.update' : 'content.create', table, id, title, old ? diff(old, row, ['image_url', 'count']) : null);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteContent(type, id) {
  try {
    const { db, me } = await admin();
    const table = TYPES[type].table;
    const { data: old } = await db.from(table).select('*').eq('id', id).maybeSingle();
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) throw error;
    await removeImage(db, old?.image_path);
    await audit(db, me, 'content.delete', table, id, old?.title || old?.name);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// copies the sample posts into the database so they can be edited
export async function importSampleContent(type) {
  try {
    const { db, me } = await admin();
    const table = TYPES[type].table;
    const rows = contentJson[table].map(({ id, ...r }) => { const o = {}; for (const f of [...FIELDS[table], 'image_url']) if (r[f] !== undefined) o[f] = r[f]; if (table === 'packages') o.count = (o.widget_slugs || []).length; return o; });
    const { error } = await db.from(table).insert(rows);
    if (error) throw error;
    await audit(db, me, 'content.import', table, null, `${rows.length} contoh bawaan`);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ---------- widgets ----------
const WIDGET_FIELDS = ['name', 'kind', 'categories', 'template', 'description', 'properties', 'hidden'];

function cleanProps(list) {
  if (!Array.isArray(list)) throw new Error('Properties tidak valid.');
  return list.map(p => ({ name: String(p.name), label: String(p.label ?? p.name), type: p.type ?? null, default: p.default ?? null, desc: String(p.desc ?? '').trim() }));
}

export async function saveWidget(w) {
  try {
    const { db, me } = await admin();
    if (!w.slug || !w.svg || !/<server[\s>]/.test(w.svg)) throw new Error('File bukan widget SmartICS (tidak ada blok <server>).');
    const { data: prev } = await db.from('widgets').select('slug, uploaded_by, uploaded_by_name, created_at').eq('slug', w.slug).maybeSingle();
    const now = new Date().toISOString();
    const row = {
      slug: w.slug, name: w.name, kind: w.kind, categories: w.categories, template: w.template, description: w.description,
      properties: cleanProps(w.properties), file_name: w.file_name, svg: w.svg, preview_svg: w.preview_svg, hidden: false, updated_at: now,
      // the first uploader stays recorded when someone uploads a new file for the same widget
      uploaded_by: prev?.uploaded_by || me.id, uploaded_by_name: prev?.uploaded_by_name || me.name,
      updated_by: me.id, updated_by_name: me.name,
      created_at: prev?.created_at || now.slice(0, 10),
    };
    const { error } = await db.from('widgets').upsert(row);
    if (error) throw error;
    const replaced = !!prev || !!bundledWidget(w.slug);
    await audit(db, me, replaced ? 'widget.replace' : 'widget.upload', 'widget', w.slug, `${w.name} (${w.file_name})`, { properties: row.properties.length, categories: w.categories });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// properties of one widget, for the edit dialog
export async function getWidgetProps(slug) {
  try {
    const { db } = await admin();
    const { data } = await db.from('widgets').select('properties').eq('slug', slug).maybeSingle();
    return { ok: true, properties: data?.properties || bundledWidget(slug)?.properties || [] };
  } catch (e) { return fail(e); }
}

// edit name/category/description/properties/hidden of any widget (a bundled one is copied into the database first)
export async function updateWidgetMeta(slug, patch) {
  try {
    const { db, me } = await admin();
    const clean = {};
    for (const k of WIDGET_FIELDS) if (patch[k] !== undefined) clean[k] = patch[k];
    if (clean.properties) clean.properties = cleanProps(clean.properties);
    const stamp = { updated_at: new Date().toISOString(), updated_by: me.id, updated_by_name: me.name };
    const { data: existing } = await db.from('widgets').select('slug, name, kind, categories, template, description, properties, hidden').eq('slug', slug).maybeSingle();
    const before = existing || bundledWidget(slug);
    if (!before) throw new Error('Widget tidak ditemukan');
    if (!existing) {
      const { error } = await db.from('widgets').insert({ ...before, svg: await getBundledSvg(slug), ...clean, ...stamp });
      if (error) throw error;
    } else {
      const { error } = await db.from('widgets').update({ ...clean, ...stamp }).eq('slug', slug);
      if (error) throw error;
    }
    const keys = Object.keys(clean);
    const action = keys.length === 1 && keys[0] === 'hidden' ? (clean.hidden ? 'widget.hide' : 'widget.show') : keys.length === 1 && keys[0] === 'properties' ? 'widget.properties' : 'widget.update';
    const details = diff(before, clean, ['properties']);
    if (clean.properties) {
      // only the properties whose label or purpose changed
      const old = new Map((before.properties || []).map(p => [p.name, p]));
      for (const p of clean.properties) {
        const o = old.get(p.name);
        if (!o || o.label !== p.label || (o.desc || '') !== p.desc) details['properti ' + p.name] = [o ? `${o.label}: ${o.desc || '-'}` : null, `${p.label}: ${p.desc || '-'}`];
      }
    }
    await audit(db, me, action, 'widget', slug, clean.name || before.name, details);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteWidget(slug) {
  try {
    const { db, me } = await admin();
    const { data: old } = await db.from('widgets').select('name, file_name').eq('slug', slug).maybeSingle();
    const { error } = await db.from('widgets').delete().eq('slug', slug);
    if (error) throw error;
    await audit(db, me, bundledWidget(slug) ? 'widget.reset' : 'widget.delete', 'widget', slug, old?.name || slug);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}
