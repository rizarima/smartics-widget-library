'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../Icon';
import { useLang } from '../LangProvider';
import { approvePartner, setPartnerStatus, setRole, createUser, setUserPassword, deleteUser } from '@/lib/admin-actions';
import { ROLES, roleLabel, assignableRoles, canManageAccount } from '@/lib/roles';

const EMPTY = { email: '', password: '', full_name: '', company: '', phone: '', role: 'member' };

function AddUser({ busy, onSave, onClose, roles, t }) {
  const [u, setU] = useState(EMPTY);
  const set = k => e => setU({ ...u, [k]: e.target.value });
  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ marginTop: 0 }}>{t('adm.partner.addUser')}</h2>
        <form className="form" onSubmit={e => { e.preventDefault(); onSave(u); }}>
          <label>{t('adm.partner.name')}<input required value={u.full_name} onChange={set('full_name')} /></label>
          <label>Email<input type="email" required value={u.email} onChange={set('email')} /></label>
          <label>Password<span>{t('adm.partner.pwHint')}</span><input required minLength={6} value={u.password} onChange={set('password')} /></label>
          <div className="row">
            <label>{t('adm.partner.company')}<input value={u.company} onChange={set('company')} /></label>
            <label>{t('adm.partner.whatsapp')}<input value={u.phone} onChange={set('phone')} placeholder="0812…" /></label>
          </div>
          <label>{t('adm.partner.role')}<select value={u.role} onChange={set('role')}>{roles.map(r => <option key={r} value={r}>{roleLabel(t, r)}{r === 'partner' ? t('adm.partner.autoApproved') : ''}</option>)}</select></label>
          <div className="actions" style={{ justifyContent: 'flex-end', marginBottom: 0 }}>
            <button type="button" className="btn btn-text" onClick={onClose}>{t('adm.content.cancel')}</button>
            <button className="btn btn-filled" disabled={busy}><Icon name="add" size={18} />{t('adm.partner.add')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PartnerTable({ rows, gateway, canManage, me }) {
  const { lang, t } = useLang();
  const STATUS = { pending: t('adm.partner.statusPending'), approved: t('adm.partner.statusApproved'), rejected: t('adm.partner.statusRejected') };
  const roles = assignableRoles(me.role);
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const run = (fn, after) => start(async () => { const r = await fn(); if (!r.ok) setMsg({ err: r.error }); else { after?.(r); router.refresh(); } });

  const approve = p => run(() => approvePartner(p.id, location.origin), r => setMsg(r.sent
    ? { ok: t('adm.partner.approvedMsgWa', { name: p.full_name, phone: p.phone }) }
    : { ok: t('adm.partner.approvedMsg', { name: p.full_name }), wa: r.waUrl, name: p.full_name }));

  const localeMap = { id: 'id-ID', en: 'en-US', vi: 'vi-VN' };
  const locale = localeMap[lang] || 'id-ID';
  const shown = rows.filter(r => filter === 'all' || r.status === filter || (filter === 'staff' && r.role !== 'partner'));
  return (
    <div className="card">
      {msg?.err && <div className="notice err" style={{ marginBottom: 12 }}>{msg.err}</div>}
      {msg?.ok && (
        <div className="notice ok" style={{ marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>{msg.ok}{msg.wa ? t('adm.partner.sendWaPrefix') : ''}</span>
          {msg.wa && <a className="btn btn-wa btn-sm" href={msg.wa} target="_blank" rel="noopener"><Icon name="chat" size={16} />{t('adm.partner.sendWaBtn', { name: msg.name })}</a>}
        </div>
      )}
      {!gateway && <p className="muted small" style={{ marginTop: 0 }}>{t('adm.partner.gatewayHint').split('FONNTE_TOKEN')[0]}<code>FONNTE_TOKEN</code>{t('adm.partner.gatewayHint').split('FONNTE_TOKEN')[1]}</p>}
      {adding && <AddUser roles={roles} busy={busy} t={t} onClose={() => setAdding(false)} onSave={u => run(() => createUser(u), () => { setAdding(false); setMsg({ ok: t('adm.partner.userCreated', { email: u.email, role: roleLabel(t, u.role) }) }); })} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {canManage
          ? <button className="btn btn-filled" onClick={() => setAdding(true)}><Icon name="add" size={18} />{t('adm.partner.addUser')}</button>
          : <p className="muted small" style={{ margin: 0 }}>{t('adm.partner.needServiceKey').split('SUPABASE_SERVICE_ROLE_KEY')[0]}<code>SUPABASE_SERVICE_ROLE_KEY</code>{t('adm.partner.needServiceKey').split('SUPABASE_SERVICE_ROLE_KEY')[1]}</p>}
      </div>
      <div className="filters" style={{ marginBottom: 10 }}>
        {[['all', t('adm.partner.filterAll')], ['pending', t('adm.partner.statusPending')], ['approved', t('adm.partner.statusApproved')], ['rejected', t('adm.partner.statusRejected')], ['staff', t('adm.partner.filterStaff')]].map(([k, l]) => (
          <button key={k} className={'fchip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l} <span className="count">{k === 'all' ? rows.length : k === 'staff' ? rows.filter(r => r.role !== 'partner').length : rows.filter(r => r.status === k).length}</span></button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>{t('adm.partner.colName')}</th><th>{t('adm.partner.colCompany')}</th><th>{t('adm.partner.colContact')}</th><th>{t('adm.partner.colRole')}</th><th>{t('adm.partner.colStatus')}</th><th>{t('adm.partner.colAction')}</th></tr></thead>
          <tbody>
            {shown.map(p => (
              <tr key={p.id}>
                <td><div className="who-cell"><span className="avatar sm">{p.avatar_url ? <img src={p.avatar_url} alt="" /> : (p.full_name || p.email || '?').trim()[0].toUpperCase()}</span><span><b>{p.full_name || '-'}</b>{p.id === me.id ? t('adm.partner.you') : ''}<br /><span className="muted small">{new Date(p.created_at).toLocaleDateString(locale)}</span></span></div></td>
                <td>{p.company || '-'}</td>
                <td className="small">{p.email}<br />{p.phone || '-'}</td>
                <td>
                  {p.id !== me.id && canManageAccount(me, p)
                    ? <select value={p.role} disabled={busy} onChange={e => run(() => setRole(p.id, e.target.value))}>
                        {ROLES.filter(r => r === p.role || roles.includes(r)).map(r => <option key={r} value={r}>{roleLabel(t, r)}</option>)}
                      </select>
                    : <span className={'role-chip r-' + p.role} title={p.id === me.id ? t('adm.partner.ownRoleLocked') : t('adm.partner.onlySuperadminChange')}>{roleLabel(t, p.role)}</span>}
                </td>
                <td><span className={'status ' + p.status}>{p.role === 'partner' ? STATUS[p.status] : t('adm.partner.statusActive')}</span></td>
                <td>
                  <div className="row-actions">
                    {p.role === 'partner' && p.status !== 'approved' && <button className="btn btn-filled btn-sm" disabled={busy} onClick={() => approve(p)}><Icon name="check" size={16} />{t('adm.partner.approve')}</button>}
                    {canManage && canManageAccount(me, p) && <button className="btn btn-sm btn-text" disabled={busy} title={t('adm.partner.changePw')} onClick={() => { const pw = prompt(t('adm.partner.promptPw', { email: p.email })); if (pw) run(() => setUserPassword(p.id, pw), () => setMsg({ ok: t('adm.partner.pwChanged', { email: p.email }) })); }}>{t('adm.partner.changePw')}</button>}
                    {canManage && p.id !== me.id && canManageAccount(me, p) && <button className="btn btn-sm btn-text btn-danger btn-icon" disabled={busy} title={t('adm.partner.deleteUser')} onClick={() => confirm(t('adm.partner.confirmDelete', { email: p.email })) && run(() => deleteUser(p.id), () => setMsg({ ok: t('adm.partner.userDeleted', { email: p.email }) }))}><Icon name="delete" size={18} /></button>}
                    {p.role === 'partner' && p.status !== 'rejected' && <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirm(t('adm.partner.confirmReject', { name: p.full_name })) && run(() => setPartnerStatus(p.id, 'rejected'))}><Icon name="close" size={16} />{p.status === 'approved' ? t('adm.partner.revoke') : t('adm.partner.reject')}</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="muted">{t('adm.partner.noData')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
