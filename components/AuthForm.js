'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

const MSG = { 'Invalid login credentials': 'Email atau password salah.', 'User already registered': 'Email ini sudah terdaftar. Silakan login.', 'Email not confirmed': 'Email belum dikonfirmasi. Cek kotak masuk Anda.' };

export default function AuthForm({ mode, next, enabled }) {
  const router = useRouter();
  const [f, setF] = useState({ full_name: '', company: '', phone: '', email: '', password: '' });
  const [state, setState] = useState({ busy: false, err: '', ok: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  if (!enabled) return <div className="notice err">Login belum aktif: database Supabase belum dihubungkan (lihat README).</div>;

  const submit = async e => {
    e.preventDefault();
    setState({ busy: true, err: '', ok: '' });
    const db = supabaseBrowser();
    let res;
    if (mode === 'login') res = await db.auth.signInWithPassword({ email: f.email, password: f.password });
    else res = await db.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { full_name: f.full_name, company: f.company, phone: f.phone }, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (res.error) return setState({ busy: false, err: MSG[res.error.message] || res.error.message, ok: '' });
    if (mode === 'register') {
      fetch('/api/partner-registered', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email }) }).catch(() => {});
      if (!res.data.session) return setState({ busy: false, err: '', ok: 'Pendaftaran berhasil. Cek email Anda untuk konfirmasi. Setelah itu admin akan meninjau akun Anda.' });
      router.push('/menunggu');
      router.refresh();
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <form className="form" onSubmit={submit}>
      {mode === 'register' && (
        <>
          <label>Nama lengkap<input required value={f.full_name} onChange={set('full_name')} /></label>
          <label>Perusahaan (PT)<input required value={f.company} onChange={set('company')} placeholder="PT …" /></label>
          <label>No. WhatsApp<span>notifikasi persetujuan dikirim ke nomor ini</span><input required inputMode="tel" pattern="[0-9+ -]{9,16}" value={f.phone} onChange={set('phone')} placeholder="0812…" /></label>
        </>
      )}
      <label>Email<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
      <label>Password{mode === 'register' && <span>minimal 6 karakter</span>}<input required type="password" minLength={6} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      {state.err && <div className="notice err">{state.err}</div>}
      {state.ok && <div className="notice ok">{state.ok}</div>}
      <button className="btn btn-filled" disabled={state.busy}>{state.busy ? 'Memproses…' : mode === 'login' ? 'Login' : 'Daftar sebagai partner'}</button>
    </form>
  );
}
