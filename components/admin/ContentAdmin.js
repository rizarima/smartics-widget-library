'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '../Icon';
import { saveContent, deleteContent, importSampleContent } from '@/lib/admin-actions';
import { CATEGORIES } from '@/lib/site';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { BUCKET, IMAGE_ACCEPT, IMAGE_HINT, checkImage, uploadImage } from '@/lib/images';

const today = () => new Date().toISOString().slice(0, 10);

function WidgetPicker({ widgets, value, onChange }) {
  const [q, setQ] = useState('');
  const sel = new Set(value);
  const shown = widgets.filter(w => w.name.toLowerCase().includes(q.toLowerCase()) || w.categories.some(c => c.toLowerCase() === q.toLowerCase()));
  const toggle = s => { const n = new Set(sel); n.has(s) ? n.delete(s) : n.add(s); onChange([...n]); };
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Cari widget atau kategori…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <button type="button" className="btn btn-sm" onClick={() => onChange([...new Set([...value, ...shown.map(w => w.slug)])])}>Pilih semua yang tampil</button>
        <button type="button" className="btn btn-sm btn-text" onClick={() => onChange([])}>Kosongkan</button>
      </div>
      <div className="pick">{shown.map(w => <label key={w.slug}><input type="checkbox" checked={sel.has(w.slug)} onChange={() => toggle(w.slug)} />{w.name}</label>)}</div>
      <span className="muted small">{value.length} widget dipilih</span>
    </div>
  );
}

// cover image: picked here, uploaded to Storage only when the form is saved
function ImageField({ edit, setEdit }) {
  const [err, setErr] = useState('');
  const shown = edit._preview || (!edit._remove && edit.image_url) || null;
  const pick = e => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const c = checkImage(f);
    if (c.error) return setErr(c.error);
    setErr('');
    setEdit(x => ({ ...x, _file: f, _preview: URL.createObjectURL(f), _remove: false }));
  };
  return (
    <div className="imgfield">
      <div className="ph" style={shown ? { backgroundImage: `url("${shown}")` } : null}>{!shown && <Icon name="image" size={36} />}</div>
      <div>
        <b style={{ fontSize: 13.5 }}>Gambar sampul</b>
        <div className="muted small">{edit._file ? `${edit._file.name} (${(edit._file.size / 1048576).toFixed(2)} MB), diupload saat disimpan` : IMAGE_HINT}</div>
        <div className="actions">
          <label className="btn btn-sm btn-tonal" style={{ cursor: 'pointer' }}><Icon name="upload" size={16} />{shown ? 'Ganti gambar' : 'Upload gambar'}<input type="file" accept={IMAGE_ACCEPT} hidden onChange={pick} /></label>
          {shown && <button type="button" className="btn btn-sm btn-text btn-danger" onClick={() => setEdit(x => ({ ...x, _file: null, _preview: null, _remove: true }))}><Icon name="delete" size={16} />Hapus</button>}
        </div>
        {err && <div className="notice err" style={{ marginTop: 8 }}>{err}</div>}
      </div>
    </div>
  );
}

export default function ContentAdmin({ type, label, items, widgets, openNew }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [edit, setEdit] = useState(openNew ? { date: today(), widget_slugs: [] } : null);
  const [err, setErr] = useState('');
  const isPkg = type === 'package';
  const set = k => e => setEdit({ ...edit, [k]: e.target.value });
  const run = (fn, after) => start(async () => { const r = await fn(); if (!r.ok) setErr(r.error); else { setErr(''); after?.(); router.refresh(); } });
  // upload the new cover first; if saving the post fails, the uploaded file is removed again
  const save = () => start(async () => {
    const { _file, _preview, _remove, image_url, image_path, ...item } = edit;
    let path = null;
    try {
      if (_file) path = await uploadImage(supabaseBrowser(), type, _file);
    } catch (e) { return setErr(e.message); }
    const r = await saveContent(type, { ...item, ...(path ? { image_path: path } : _remove ? { removeImage: true } : {}) });
    if (!r.ok) {
      if (path) await supabaseBrowser().storage.from(BUCKET).remove([path]);
      return setErr(r.error);
    }
    setErr('');
    setEdit(null);
    router.refresh();
  });

  return (
    <>
      <div className="page-head">
        <div><h1>{label}</h1><p>Tulis, ubah, atau hapus {label.toLowerCase()} yang tampil di website.</p></div>
        <button className="btn btn-filled" onClick={() => setEdit({ date: today(), widget_slugs: [] })}><Icon name="add" size={18} />{label} baru</button>
      </div>
      {err && <div className="notice err" style={{ marginBottom: 12 }}>{err}</div>}
      {!items.length && (
        <div className="notice" style={{ marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ flex: 1 }}>Belum ada {label.toLowerCase()} di database, jadi website menampilkan contoh bawaan. Salin contoh itu supaya bisa diedit, atau langsung buat yang baru (contoh bawaan otomatis tersembunyi).</span>
          <button className="btn btn-sm" disabled={busy} onClick={() => run(() => importSampleContent(type))}>Salin contoh ke database</button>
        </div>
      )}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th></th><th>Tanggal</th><th>Judul</th>{isPkg && <th>Widget</th>}<th>Aksi</th></tr></thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id}>
                <td>{x.image_url ? <img src={x.image_url} alt="" style={{ objectFit: 'cover', padding: 0 }} /> : <span className="muted"><Icon name="image" size={20} /></span>}</td>
                <td className="small">{x.date}</td>
                <td><b>{x.title || x.name}</b>{x.version ? <span className="ver" style={{ marginLeft: 6 }}>v{x.version}</span> : null}</td>
                {isPkg && <td>{(x.widget_slugs || []).length}</td>}
                <td><div className="row-actions">
                  <Link className="btn btn-sm btn-text" href={`/${type}/${x.id}`} target="_blank"><Icon name="eye" size={16} />Lihat</Link>
                  <button className="btn btn-sm" onClick={() => setEdit({ ...x, widget_slugs: x.widget_slugs || [] })}><Icon name="edit" size={16} />Ubah</button>
                  <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirm(x.image_path ? 'Hapus permanen? Gambar sampulnya juga ikut dihapus.' : 'Hapus permanen?') && run(() => deleteContent(type, x.id))}><Icon name="delete" size={16} /></button>
                </div></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="muted">Belum ada data.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="backdrop" onClick={e => e.target === e.currentTarget && setEdit(null)}>
          <div className="modal wide">
            <h2>{edit.id ? 'Ubah' : 'Tambah'} {label.toLowerCase()}</h2>
            <form className="form" onSubmit={e => { e.preventDefault(); save(); }}>
              <div className="row">
                <label>{isPkg ? 'Nama package' : 'Judul'}<input required value={(isPkg ? edit.name : edit.title) || ''} onChange={set(isPkg ? 'name' : 'title')} /></label>
                <label>Tanggal<input type="date" required value={edit.date || ''} onChange={set('date')} /></label>
              </div>
              {isPkg && (
                <>
                  <div className="row">
                    <label>Versi<input value={edit.version || ''} onChange={set('version')} placeholder="1.0" /></label>
                    <label>Template<select value={edit.template || ''} onChange={set('template')}><option value="">-</option><option>Template 1 - Indikator</option><option>Template 2 - Tank level</option><option>Template 3 - Pipa</option><option>Template 4 - Conveyor</option></select></label>
                  </div>
                  <label>Kategori utama<select value={edit.category || ''} onChange={set('category')}><option value="">-</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
                  <label>Ringkasan<span>satu kalimat untuk kartu package</span><input value={edit.description || ''} onChange={set('description')} /></label>
                </>
              )}
              <label>Isi<span>pisahkan paragraf dengan baris kosong; baris diawali "- " menjadi daftar</span><textarea rows={8} value={edit.body || ''} onChange={set('body')} /></label>
              <ImageField edit={edit} setEdit={setEdit} />
              {isPkg && <div className="field">Widget dalam package<WidgetPicker widgets={widgets} value={edit.widget_slugs} onChange={v => setEdit({ ...edit, widget_slugs: v })} /></div>}
              {err && <div className="notice err">{err}</div>}
              <div className="actions" style={{ margin: 0 }}>
                <button className="btn btn-filled" disabled={busy}><Icon name="check" size={18} />{busy ? 'Menyimpan…' : 'Simpan & tayangkan'}</button>
                <button type="button" className="btn btn-text" onClick={() => setEdit(null)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
