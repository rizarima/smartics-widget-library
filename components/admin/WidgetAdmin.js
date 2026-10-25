'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '../Icon';
import { saveWidget, updateWidgetMeta, deleteWidget } from '@/lib/admin-actions';
import { CATEGORIES } from '@/lib/site';
import { slugify, prettyName, guessCategories, guessKind, describeProperties, TEMPLATE_TEXT } from '@/lib/widget-docs';

// static thumbnail: conditional parts and Vue bindings removed, tanks half full
function makePreview(doc) {
  const svg = doc.documentElement.cloneNode(true);
  [...svg.querySelectorAll('*')].forEach(el => { if (el.hasAttribute('v-if') || ['server', 'metadata'].includes(el.localName)) el.remove(); });
  [svg, ...svg.querySelectorAll('*')].forEach(el => {
    [...el.attributes].forEach(a => {
      if (!(a.name.startsWith('v-') || a.name.startsWith('xmlns:v-') || a.name === 'xmlns:server')) return;
      const bound = /^v-bind:(fill|stroke)$/.exec(a.name);
      if (bound && !el.hasAttribute(bound[1])) el.setAttribute(bound[1], '#000000'); // bound colour: show the original black
      el.removeAttribute(a.name);
    });
    if (el.localName === 'rect' && el.getAttribute('x') === '-0.5' && el.getAttribute('y') === '-1') { el.setAttribute('height', '1.55'); el.setAttribute('fill', '#2196F3'); }
  });
  return new XMLSerializer().serializeToString(svg);
}

function parseWidget(file, text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('SVG tidak valid');
  const pm = /<properties>([\s\S]*?)<\/properties>/.exec(text);
  if (!/<server[\s>]/.test(text) || !pm) throw new Error('Bukan widget SmartICS (blok <server>/<properties> tidak ada)');
  const props = JSON.parse(pm[1]);
  let tr = {};
  try { tr = JSON.parse(/<translations>([\s\S]*?)<\/translations>/.exec(text)[1]).id || {}; } catch { /* no translations */ }
  const base = file.name.replace(/\.svg$/i, '').replace(/\s\d+$/, '');
  const key = base.toLowerCase();
  const alias = /<server[^>]*\sAlias="([^"]*)"/.exec(text)?.[1];
  const has = n => props.some(p => p.name === n);
  const template = has('level') ? 'Template 2 - Tank level' : has('flow') ? 'Template 3 - Pipa' : has('beltAnimation') ? 'Template 4 - Conveyor' : has('indicator') ? 'Template 1 - Indikator' : 'Custom';
  const k = guessKind(key);
  return {
    slug: slugify(base), name: alias || prettyName(base), kind: k.kind, categories: guessCategories(key),
    template,
    description: [k.text, TEMPLATE_TEXT[template], 'Ukuran default 100 x 100 dan siap diimport ke SmartICS.'].filter(Boolean).join(' '),
    properties: describeProperties(props, tr), file_name: base + '.svg', svg: text, preview_svg: makePreview(doc),
  };
}

function Cats({ value, onChange }) {
  return <div className="checks">{CATEGORIES.map(c => <label key={c.id}><input type="checkbox" checked={value.includes(c.id)} onChange={e => onChange(e.target.checked ? [...value, c.id] : value.filter(x => x !== c.id))} />{c.label}</label>)}</div>;
}

export default function WidgetAdmin({ widgets }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [uploads, setUploads] = useState([]);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const existing = useMemo(() => new Map(widgets.map(w => [w.slug, w])), [widgets]);

  const onFiles = async files => {
    const out = [];
    for (const f of files) {
      try { out.push(parseWidget(f, await f.text())); } catch (e) { out.push({ error: `${f.name}: ${e.message}`, slug: f.name }); }
    }
    setUploads(u => [...u, ...out]);
  };
  const setU = (i, patch) => setUploads(u => u.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const saveAll = () => start(async () => {
    const ok = [], bad = [];
    for (const w of uploads.filter(x => !x.error)) { const r = await saveWidget(w); (r.ok ? ok : bad).push(r.ok ? w.name : `${w.name}: ${r.error}`); }
    setMsg(bad.length ? { err: bad.join(' · ') } : { ok: `${ok.length} widget tersimpan dan langsung tayang.` });
    if (!bad.length) setUploads([]);
    router.refresh();
  });
  const run = fn => start(async () => { const r = await fn(); if (!r.ok) setMsg({ err: r.error }); else { setMsg(null); setEdit(null); router.refresh(); } });
  const shown = widgets.filter(w => !q || w.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-head"><div><h1>Widget</h1><p>Upload widget baru atau ganti widget lama. File dengan nama yang sama menggantikan widget yang sudah ada.</p></div></div>
      {msg?.err && <div className="notice err" style={{ marginBottom: 12 }}>{msg.err}</div>}
      {msg?.ok && <div className="notice ok" style={{ marginBottom: 12 }}>{msg.ok}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-head"><h2><Icon name="upload" />Upload widget</h2></div>
        <label className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFiles([...e.dataTransfer.files].filter(f => /\.svg$/i.test(f.name))); }}>
          <Icon name="upload" size={32} /><br /><b>Pilih atau tarik file SVG ke sini</b><br /><span className="muted small">Bisa beberapa file sekaligus. File harus sudah format SmartICS (hasil konversi Template 1-4).</span>
          <input type="file" accept=".svg,image/svg+xml" multiple hidden onChange={e => { onFiles([...e.target.files]); e.target.value = ''; }} />
        </label>
        {uploads.length > 0 && (
          <div className="grid" style={{ marginTop: 16, gap: 10 }}>
            {uploads.map((w, i) => w.error ? <div key={i} className="notice err">{w.error}</div> : (
              <div key={i} className="upl">
                <img alt="" src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(w.preview_svg)} />
                <div className="form" style={{ gap: 8 }}>
                  <div className="row">
                    <label>Nama<input value={w.name} onChange={e => setU(i, { name: e.target.value })} /></label>
                    <label>Jenis<input value={w.kind} onChange={e => setU(i, { kind: e.target.value })} /></label>
                  </div>
                  <Cats value={w.categories} onChange={v => setU(i, { categories: v })} />
                  <label>Deskripsi<input value={w.description} onChange={e => setU(i, { description: e.target.value })} /></label>
                  <span className="small muted">{w.template} · {w.properties.length} properti · <code>{w.slug}</code> {existing.has(w.slug) && <b style={{ color: 'var(--warn)' }}>· akan mengganti widget yang sudah ada</b>}</span>
                </div>
              </div>
            ))}
            <div className="actions" style={{ margin: 0 }}>
              <button className="btn btn-filled" disabled={busy || !uploads.some(x => !x.error)} onClick={saveAll}><Icon name="check" size={18} />{busy ? 'Menyimpan…' : `Simpan ${uploads.filter(x => !x.error).length} widget`}</button>
              <button className="btn btn-text" onClick={() => setUploads([])}>Batal</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-head"><h2><Icon name="widgets" />Semua widget ({widgets.length})</h2><div className="search"><Icon name="search" size={18} /><input placeholder="Cari…" value={q} onChange={e => setQ(e.target.value)} /></div></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th></th><th>Nama</th><th>Kategori</th><th>Sumber</th><th>Aksi</th></tr></thead>
            <tbody>
              {shown.map(w => (
                <tr key={w.slug} style={w.hidden ? { opacity: .5 } : null}>
                  <td><img src={w.thumb} alt="" /></td>
                  <td><b>{w.name}</b><br /><span className="muted small">{w.kind}{w.hidden ? ' · disembunyikan' : ''}</span></td>
                  <td className="small">{w.categories.join(', ')}</td>
                  <td><span className="chip">{w.source}</span></td>
                  <td><div className="row-actions">
                    <Link className="btn btn-sm btn-text" href={`/widgets/${w.slug}`} target="_blank"><Icon name="eye" size={16} /></Link>
                    <button className="btn btn-sm" onClick={() => setEdit({ slug: w.slug, name: w.name, kind: w.kind || '', categories: w.categories, description: w.description || '' })}><Icon name="edit" size={16} />Ubah</button>
                    <button className="btn btn-sm" disabled={busy} onClick={() => run(() => updateWidgetMeta(w.slug, { hidden: !w.hidden }))}><Icon name={w.hidden ? 'eye' : 'eyeoff'} size={16} />{w.hidden ? 'Tampilkan' : 'Sembunyikan'}</button>
                    {w.source !== 'bawaan' && <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirm(w.source === 'diubah' ? 'Kembalikan ke versi bawaan?' : 'Hapus widget ini?') && run(() => deleteWidget(w.slug))}><Icon name="delete" size={16} />{w.source === 'diubah' ? 'Reset' : ''}</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="backdrop" onClick={e => e.target === e.currentTarget && setEdit(null)}>
          <div className="modal wide">
            <h2>Ubah widget</h2>
            <form className="form" onSubmit={e => { e.preventDefault(); const { slug, ...patch } = edit; run(() => updateWidgetMeta(slug, patch)); }}>
              <div className="row">
                <label>Nama<input required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
                <label>Jenis<input value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })} /></label>
              </div>
              <label>Kategori<Cats value={edit.categories} onChange={v => setEdit({ ...edit, categories: v })} /></label>
              <label>Deskripsi<textarea rows={4} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></label>
              <p className="muted small" style={{ margin: 0 }}>Untuk mengganti gambar/fitur widget, upload file SVG baru dengan nama file yang sama.</p>
              <div className="actions" style={{ margin: 0 }}>
                <button className="btn btn-filled" disabled={busy}><Icon name="check" size={18} />Simpan</button>
                <button type="button" className="btn btn-text" onClick={() => setEdit(null)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
