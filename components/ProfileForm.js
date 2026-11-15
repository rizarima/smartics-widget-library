'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { useLang } from './LangProvider';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from '@/lib/images';
import { updateProfile, setAvatar, removeAvatar, logAccountChange } from '@/lib/profile-actions';

const PHOTO_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.avif,image/png,image/jpeg,image/webp,image/gif,image/avif';
const Msg = ({ m }) => (m?.err ? <div className="notice err">{m.err}</div> : m?.ok ? <div className="notice ok">{m.ok}</div> : null);

export default function ProfileForm({ user }) {
  const router = useRouter();
  const { t } = useLang();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({});
  const [f, setF] = useState({ full_name: user.name === user.email ? '' : user.name, company: user.company || '', phone: user.phone || '' });
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const say = (k, m) => setMsg(x => ({ ...x, [k]: m }));
  const task = (k, fn) => async e => {
    e?.preventDefault?.();
    setBusy(k); say(k, null);
    try { await fn(); } catch (err) { say(k, { err: err.message || String(err) }); }
    setBusy('');
  };
  const ok = r => { if (!r.ok) throw new Error(r.error); return r; };

  const pickPhoto = task('photo', async () => {
    const input = document.getElementById('photo-input');
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!(IMAGE_TYPES[file.type] && file.type !== 'image/svg+xml') && !['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'].includes(ext)) throw new Error(t('prof.photoErrType'));
    if (file.size > MAX_IMAGE_BYTES) throw new Error(t('prof.photoErrSize'));
    const db = supabaseBrowser();
    const path = await uploadImage(db, `avatar/${user.id}`, file, { svg: false });
    const r = await setAvatar(path);
    if (!r.ok) { await db.storage.from(BUCKET).remove([path]); throw new Error(r.error); }
    say('photo', { ok: t('prof.photoSaved') });
    router.refresh();
  });
  const dropPhoto = task('photo', async () => { ok(await removeAvatar()); router.refresh(); });

  const saveData = task('data', async () => { ok(await updateProfile(f)); say('data', { ok: t('prof.saved') }); router.refresh(); });

  const saveEmail = task('email', async () => {
    const e = email.trim().toLowerCase();
    if (e === user.email.toLowerCase()) throw new Error(t('prof.emailSame'));
    const { data, error } = await supabaseBrowser().auth.updateUser({ email: e }, { emailRedirectTo: `${location.origin}/auth/callback?next=/profil` });
    if (error) throw error;
    await logAccountChange('email', e);
    const pending = data.user?.new_email || data.user?.email !== e;
    say('email', { ok: pending ? t('prof.emailSent', { e }) : t('prof.emailChanged', { e }) });
    setEmail('');
    router.refresh();
  });

  const savePw = task('pw', async () => {
    if (pw.next !== pw.again) throw new Error(t('prof.pwMismatch'));
    const db = supabaseBrowser();
    // check the current password first
    const { error: e1 } = await db.auth.signInWithPassword({ email: user.email, password: pw.current });
    if (e1) throw new Error(t('prof.pwWrong'));
    const { error } = await db.auth.updateUser({ password: pw.next });
    if (error) throw error;
    await logAccountChange('password');
    setPw({ current: '', next: '', again: '' });
    say('pw', { ok: t('prof.pwChanged') });
  });

  return (
    <>
      <div className="card">
        <h2><Icon name="camera" />{t('prof.photo')}</h2>
        <div className="photo-row">
          <span className="avatar lg">{user.avatar ? <img src={user.avatar} alt="" /> : (user.name || '?').trim()[0].toUpperCase()}</span>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><b>{user.name}</b><br /><span className="muted small">{user.email} · {t('prof.role')}: {t('role.' + user.role)}{user.role === 'partner' && user.status !== 'approved' ? t('role.pending') : ''}</span></div>
            <div className="actions">
              <label className="btn btn-sm btn-tonal" style={{ cursor: 'pointer' }}><Icon name="upload" size={16} />{busy === 'photo' ? t('auth.busy') : t('prof.changePhoto')}<input id="photo-input" type="file" accept={PHOTO_ACCEPT} hidden disabled={!!busy} onChange={pickPhoto} /></label>
              {user.avatar && <button className="btn btn-sm btn-text btn-danger" disabled={!!busy} onClick={dropPhoto}><Icon name="delete" size={16} />{t('prof.removePhoto')}</button>}
            </div>
            <span className="muted small">{t('prof.photoHint')}</span>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><Msg m={msg.photo} /></div>
      </div>

      <form className="card form" onSubmit={saveData}>
        <h2><Icon name="person" />{t('prof.data')}</h2>
        <label>{t('f.fullName')}<input required value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} autoComplete="name" /></label>
        <div className="row">
          <label>{t('f.company')}<input value={f.company} onChange={e => setF({ ...f, company: e.target.value })} autoComplete="organization" /></label>
          <label>{t('f.phone')}<input inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder={t('f.phonePh')} autoComplete="tel" /></label>
        </div>
        <Msg m={msg.data} />
        <div><button className="btn btn-filled" disabled={!!busy}><Icon name="check" size={18} />{busy === 'data' ? t('auth.busy') : t('prof.save')}</button></div>
      </form>

      <form className="card form" onSubmit={saveEmail}>
        <h2><Icon name="mail" />{t('prof.emailTitle')}</h2>
        <label>{t('prof.currentEmail')}<input value={user.email} disabled /></label>
        <label>{t('prof.newEmail')}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        <Msg m={msg.email} />
        <div><button className="btn btn-filled" disabled={!!busy}><Icon name="mail" size={18} />{busy === 'email' ? t('auth.busy') : t('prof.changeEmail')}</button></div>
      </form>

      <form className="card form" onSubmit={savePw}>
        <h2><Icon name="key" />{t('prof.pwTitle')}</h2>
        <input type="email" value={user.email} autoComplete="username" readOnly hidden />
        <label>{t('prof.currentPw')}<input type="password" required value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></label>
        <div className="row">
          <label>{t('prof.newPw')}<span>{t('f.passwordHint')}</span><input type="password" required minLength={6} value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></label>
          <label>{t('prof.confirmPw')}<span>&nbsp;</span><input type="password" required minLength={6} value={pw.again} onChange={e => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" /></label>
        </div>
        <Msg m={msg.pw} />
        <div><button className="btn btn-filled" disabled={!!busy}><Icon name="key" size={18} />{busy === 'pw' ? t('auth.busy') : t('prof.changePw')}</button></div>
      </form>
    </>
  );
}
