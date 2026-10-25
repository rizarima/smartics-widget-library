'use client';
import { useState } from 'react';
import { WHATSAPP } from "@/lib/site";
import Icon from "./Icon";
import { useLang } from "./LangProvider";

export default function RequestButton({ slug, name }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', company: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = e => {
    e.preventDefault();
    const text = t('req.msg', { name: f.name, email: f.email, company: f.company, w: name, slug });
    // the window must open inside the click, before any await, or the browser blocks it
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, slug }) }).catch(() => {});
    setOpen(false);
  };

  return (
    <>
      <button className="btn btn-wa" onClick={() => setOpen(true)}><Icon name="chat" size={18} />{t('req.button')}</button>
      {open && (
        <div className="backdrop" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="req-title">
            <h2 id="req-title">{t('req.title')}</h2>
            <p className="muted small">{t('req.note')} <b>{name}</b>.</p>
            <form className="form" onSubmit={submit}>
              <label>{t('f.name')}<input required value={f.name} onChange={set('name')} autoFocus /></label>
              <label>{t('f.email')}<input required type="email" value={f.email} onChange={set('email')} /></label>
              <label>{t('f.company')}<input required value={f.company} onChange={set('company')} placeholder={t('f.companyPh')} /></label>
              <div className="actions" style={{ margin: 0 }}>
                <button className="btn btn-wa"><Icon name="chat" size={18} />{t('req.send')}</button>
                <button type="button" className="btn btn-text" onClick={() => setOpen(false)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
