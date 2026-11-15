'use client';
import { useRef, useState } from 'react';
import Icon from '../Icon';
import { traceWatermark } from '@/lib/build-actions';

const fmtDate = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function TraceVerify() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  async function scan(file) {
    setErr(''); setResult(null);
    if (!file) return;
    if (!/\.svg$/i.test(file.name)) { setErr('Hanya file .svg yang bisa dipindai.'); return; }
    setBusy(true);
    try {
      const text = await file.text();
      const r = await traceWatermark(text);
      if (!r.ok) setErr(r.error); else setResult(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><div><h1>Trace &amp; Verify Widget</h1><p>Upload file SVG yang dicurigai hasil kebocoran — sistem akan mencari watermark tersembunyi dan mencocokkannya ke riwayat build.</p></div></div>
      {err && <div className="notice err" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); scan(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className="card-flat"
          style={{ border: '2px dashed var(--outline)', textAlign: 'center', padding: 36, cursor: 'pointer' }}
        >
          <Icon name="upload" size={28} />
          <p style={{ margin: '8px 0 0' }}>{busy ? 'Memindai…' : 'Klik atau drag file .svg ke sini'}</p>
          <input ref={inputRef} type="file" accept=".svg,image/svg+xml" hidden onChange={e => scan(e.target.files?.[0])} />
        </div>
      </div>

      {result && (
        <div className="card">
          {!result.found && <div className="notice warn"><Icon name="warning" size={18} />Tidak ditemukan watermark sama sekali di file ini — mungkin widget asli tanpa lisensi, atau bukan hasil build dari sistem ini.</div>}
          {result.found && !result.valid && <div className="notice err"><Icon name="warning" size={18} />Ditemukan watermark tapi tanda tangannya tidak valid (dimodifikasi/dipalsukan).</div>}
          {result.found && result.valid && !result.matched && <div className="notice warn"><Icon name="warning" size={18} />Watermark valid ({result.watermarkId}) tapi tidak ada di riwayat build — mungkin data lama/sudah dihapus.</div>}
          {result.found && result.valid && result.matched && (
            <>
              <div className="notice err" style={{ marginBottom: 16 }}><Icon name="warning" size={18} />IDENTIFIED — widget ini berasal dari build berikut:</div>
              <table className="table">
                <tbody>
                  <tr><th>Partner</th><td>{result.build.partner_name} ({result.build.partner_unique_id})</td></tr>
                  <tr><th>Paket</th><td>{result.build.package_name || '-'}</td></tr>
                  <tr><th>Jumlah widget dalam build</th><td>{result.build.widget_count}</td></tr>
                  <tr><th>Tanggal build</th><td>{fmtDate(result.build.built_at)}</td></tr>
                  <tr><th>Dibuild oleh</th><td>{result.build.built_by_name}</td></tr>
                  <tr><th>Watermark ID</th><td><code>{result.watermarkId}</code></td></tr>
                </tbody>
              </table>
              <p className="muted small" style={{ marginTop: 14 }}>Saran: cek riwayat distribusi/penggunaan partner ini, atau hubungi untuk klarifikasi sebelum mengambil tindakan lisensi.</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
