'use client';
import { useState } from 'react';
import { WHATSAPP } from "@/lib/site";
import Icon from "./Icon";

export default function RequestButton({ slug, name }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', company: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = e => {
    e.preventDefault();
    const text = `Hi! saya ${f.name} (${f.email}) dari ${f.company}, saya membutuhkan detail tentang widget ${name} (${slug}).`;
    // the window must open inside the click, before any await, or the browser blocks it
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, slug }) }).catch(() => {});
    setOpen(false);
  };

  return (
    <>
      <button className="btn btn-wa" onClick={() => setOpen(true)}><Icon name="chat" size={18} />Request detail</button>
      {open && (
        <div className="backdrop" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="req-title">
            <h2 id="req-title">Request widget</h2>
            <p className="muted small">Isi data Anda. Setelah dikirim, WhatsApp akan terbuka dengan pesan untuk widget <b>{name}</b>.</p>
            <form className="form" onSubmit={submit}>
              <label>Nama<input required value={f.name} onChange={set('name')} autoFocus /></label>
              <label>Email<input required type="email" value={f.email} onChange={set('email')} /></label>
              <label>Perusahaan (PT)<input required value={f.company} onChange={set('company')} placeholder="PT …" /></label>
              <div className="actions" style={{ margin: 0 }}>
                <button className="btn btn-wa"><Icon name="chat" size={18} />Kirim via WhatsApp</button>
                <button type="button" className="btn btn-text" onClick={() => setOpen(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
