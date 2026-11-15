'use server';
import { revalidatePath } from 'next/cache';
import { supabaseServer, getCurrentUser } from './supabase-server';
import { publicImageUrl } from './images';
import { audit, diff, removeImage } from './audit';

const fail = e => ({ ok: false, error: e?.message || String(e) });
async function me() {
  const u = await getCurrentUser();
  if (!u) throw new Error('Silakan login dulu.');
  return { db: supabaseServer(), u };
}

export async function updateProfile(f) {
  try {
    const { db, u } = await me();
    const name = String(f.full_name || '').trim();
    if (!name) throw new Error('Nama wajib diisi.');
    const row = { full_name: name, company: String(f.company || '').trim() || null, phone: String(f.phone || '').trim() || null };
    const { error } = await db.from('profiles').update(row).eq('id', u.id);
    if (error) throw error;
    await audit(db, u, 'profile.update', 'profile', u.id, name, diff({ full_name: u.name, company: u.company || null, phone: u.phone || null }, row));
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// path: the photo the browser just uploaded to avatar/<user id>/...
export async function setAvatar(path) {
  try {
    const { db, u } = await me();
    if (!path || !path.startsWith(`avatar/${u.id}/`) || path.includes('..')) throw new Error('Lokasi foto tidak valid.');
    const { error } = await db.from('profiles').update({ avatar_path: path, avatar_url: publicImageUrl(path) }).eq('id', u.id);
    if (error) throw error;
    if (u.avatarPath && u.avatarPath !== path) await removeImage(db, u.avatarPath);
    await audit(db, u, 'profile.avatar', 'profile', u.id, u.name);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function removeAvatar() {
  try {
    const { db, u } = await me();
    const { error } = await db.from('profiles').update({ avatar_path: null, avatar_url: null }).eq('id', u.id);
    if (error) throw error;
    await removeImage(db, u.avatarPath);
    await audit(db, u, 'profile.avatar_remove', 'profile', u.id, u.name);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) { return fail(e); }
}

// called by the browser after a password or email change went through
export async function logAccountChange(kind, newEmail) {
  try {
    const { db, u } = await me();
    if (kind === 'password') await audit(db, u, 'profile.password', 'profile', u.id, u.name);
    else if (kind === 'email') {
      const { data: { user } } = await db.auth.getUser();
      // the trigger copies the login email into the profile
      await db.from('profiles').update({ email: user.email }).eq('id', u.id);
      await audit(db, u, 'profile.email', 'profile', u.id, u.name, { email: [u.email, newEmail || user.email], confirmed: user.email === newEmail });
      revalidatePath('/', 'layout');
    }
    return { ok: true };
  } catch (e) { return fail(e); }
}
