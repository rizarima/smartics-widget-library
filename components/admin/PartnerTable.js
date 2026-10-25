'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../Icon';
import { approvePartner, setPartnerStatus, setRole, createUser, setUserPassword, deleteUser } from '@/lib/admin-actions';

const EMPTY = { email: '', password: '', full_name: '', company: '', phone: '', role: 'member' };

function AddUser({ busy, onSave, onClose }) {
  const [u, setU] = useState(EMPTY);
  const set = k => e => setU({ ...u, [k]: e.target.value });
  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ marginTop: 0 }}>Tambah user</h2>
        <form className="form" onSubmit={e => { e.preventDefault(); onSave(u); }}>
          <label>Nama<input required value={u.full_name} onChange={set('full_name')} /></label>
          <label>Email<input type="email" required value={u.email} onChange={set('email')} /></label>
          <label>Password<span>minimal 6 karakter, berikan ke user ini</span><input required minLength={6} value={u.password} onChange={set('password')} /></label>
          <div className="row">
            <label>Perusahaan<input value={u.company} onChange={set('company')} /></label>
            <label>No. WhatsApp<input value={u.phone} onChange={set('phone')} placeholder="0812…" /></label>
          </div>
          <label>Peran<select value={u.role} onChange={set('role')}><option value="member">Member</option><option value="partner">Partner (langsung disetujui)</option><option value="admin">Admin</option></select></label>
          <div className="actions" style={{ justifyContent: 'flex-end', marginBottom: 0 }}>
            <button type="button" className="btn btn-text" onClick={onClose}>Batal</button>
            <button className="btn btn-filled" disabled={busy}><Icon name="add" size={18} />Tambah</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

export default function PartnerTable({ rows, gateway, canManage, me }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const run = (fn, after) => start(async () => { const r = await fn(); if (!r.ok) setMsg({ err: r.error }); else { after?.(r); router.refresh(); } });

  const approve = p => run(() => approvePartner(p.id, location.origin), r => setMsg(r.sent
    ? { ok: `${p.full_name} disetujui. Notifikasi WhatsApp terkirim otomatis ke ${p.phone}.` }
    : { ok: `${p.full_name} disetujui.`, wa: r.waUrl, name: p.full_name }));

  const shown = rows.filter(r => filter === 'all' || r.status === filter || (filter === 'staff' && r.role !== 'partner'));
  return (
    <div className="card">
      {msg?.err && <div className="notice err" style={{ marginBottom: 12 }}>{msg.err}</div>}
      {msg?.ok && (
        <div className="notice ok" style={{ marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>{msg.ok}{msg.wa ? ' Kirim notifikasinya lewat WhatsApp:' : ''}</span>
          {msg.wa && <a className="btn btn-wa btn-sm" href={msg.wa} target="_blank" rel="noopener"><Icon name="chat" size={16} />Kirim WA ke {msg.name}</a>}
        </div>
      )}
      {!gateway && <p className="muted small" style={{ marginTop: 0 }}>Notifikasi dikirim dengan membuka WhatsApp Anda. Supaya terkirim otomatis, isi <code>FONNTE_TOKEN</code> di Vercel (lihat tutorial).</p>}
      {adding && <AddUser busy={busy} onClose={() => setAdding(false)} onSave={u => run(() => createUser(u), () => { setAdding(false); setMsg({ ok: `User ${u.email} dibuat sebagai ${u.role}. Berikan email dan password-nya ke user tersebut.` }); })} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {canManage
          ? <button className="btn btn-filled" onClick={() => setAdding(true)}><Icon name="add" size={18} />Tambah user</button>
          : <p className="muted small" style={{ margin: 0 }}>Untuk menambah, reset password, atau menghapus user, isi <code>SUPABASE_SERVICE_ROLE_KEY</code> di Vercel (Settings &gt; Environment Variables), lalu redeploy.</p>}
      </div>
      <div className="filters" style={{ marginBottom: 10 }}>
        {[['all', 'Semua'], ['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak'], ['staff', 'Member & admin']].map(([k, l]) => (
          <button key={k} className={'fchip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l} <span className="count">{k === 'all' ? rows.length : k === 'staff' ? rows.filter(r => r.role !== 'partner').length : rows.filter(r => r.status === k).length}</span></button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Nama</th><th>Perusahaan</th><th>Kontak</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {shown.map(p => (
              <tr key={p.id}>
                <td><b>{p.full_name || '-'}</b><br /><span className="muted small">{new Date(p.created_at).toLocaleDateString('id-ID')}</span></td>
                <td>{p.company || '-'}</td>
                <td className="small">{p.email}<br />{p.phone || '-'}</td>
                <td>
                  <select value={p.role} disabled={busy || p.id === me} onChange={e => run(() => setRole(p.id, e.target.value))}>
                    <option value="partner">Partner</option><option value="member">Member</option><option value="admin">Admin</option>
                  </select>
                </td>
                <td><span className={'status ' + p.status}>{p.role === 'partner' ? STATUS[p.status] : 'Aktif'}</span></td>
                <td>
                  <div className="row-actions">
                    {p.role === 'partner' && p.status !== 'approved' && <button className="btn btn-filled btn-sm" disabled={busy} onClick={() => approve(p)}><Icon name="check" size={16} />Setujui</button>}
                    {canManage && <button className="btn btn-sm btn-text" disabled={busy} title="Ganti password" onClick={() => { const pw = prompt(`Password baru untuk ${p.email} (minimal 6 karakter):`); if (pw) run(() => setUserPassword(p.id, pw), () => setMsg({ ok: `Password ${p.email} sudah diganti.` })); }}>Ganti password</button>}
                    {canManage && p.id !== me && <button className="btn btn-sm btn-text btn-danger btn-icon" disabled={busy} title="Hapus user" onClick={() => confirm(`Hapus akun ${p.email}? Tidak bisa dibatalkan.`) && run(() => deleteUser(p.id), () => setMsg({ ok: `Akun ${p.email} dihapus.` }))}><Icon name="delete" size={18} /></button>}
                    {p.role === 'partner' && p.status !== 'rejected' && <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirm(`Tolak / cabut akses ${p.full_name}?`) && run(() => setPartnerStatus(p.id, 'rejected'))}><Icon name="close" size={16} />{p.status === 'approved' ? 'Cabut' : 'Tolak'}</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="muted">Tidak ada data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
