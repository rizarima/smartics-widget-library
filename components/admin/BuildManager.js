'use client';
import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { startBuild, runBuildBatch, getBuildDownloadUrl, rebuildFromHistory } from '@/lib/build-actions';
import { BATCH_SIZE } from '@/lib/build-config';

const STATUS_LABEL = { pending: 'Menunggu', building: 'Sedang build', done: 'Siap diunduh', failed: 'Gagal' };
const fmtDate = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

function ProgressBar({ completed, total, startedAt }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const avgMs = completed > 0 ? (Date.now() - startedAt) / completed : null;
  const etaSec = avgMs && completed < total ? Math.round((avgMs * (total - completed)) / 1000) : 0;
  return (
    <div>
      <div className="progress-track"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
      <p className="muted small" style={{ margin: '6px 0 0' }}>
        Batch {Math.min(completed, total)} dari {total} ({pct}%){completed < total && etaSec > 0 ? ` — estimasi ${etaSec < 60 ? etaSec + ' detik' : Math.ceil(etaSec / 60) + ' menit'} lagi` : ''}
      </p>
    </div>
  );
}

export default function BuildManager({ widgets, packages, partners, builds: initialBuilds, hasSecret }) {
  const [partnerId, setPartnerId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState('');
  const [run, setRun] = useState(null); // { buildId, total, completed, status, error, startedAt, zipUrl }
  const [busy, setBusy] = useState(false);
  const [builds, setBuilds] = useState(initialBuilds);
  const [err, setErr] = useState('');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return !ql ? widgets : widgets.filter(w => w.name.toLowerCase().includes(ql) || w.slug.includes(ql));
  }, [widgets, q]);

  const toggle = slug => setSelected(s => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  const pickPackage = id => {
    const pkg = packages.find(p => String(p.id) === id);
    if (!pkg) return;
    setSelected(new Set(pkg.widget_slugs));
    setPackageName(pkg.name);
  };

  async function start() {
    setErr(''); setBusy(true);
    const slugs = [...selected];
    const r = await startBuild({ partnerId, packageName, widgetSlugs: slugs });
    if (!r.ok) { setErr(r.error); setBusy(false); return; }
    setRun({ buildId: r.buildId, total: r.totalBatches, completed: 0, status: 'building', startedAt: Date.now(), zipUrl: null });
    for (let i = 0; i < r.totalBatches; i++) {
      const b = await runBuildBatch(r.buildId, i);
      if (!b.ok) { setRun(prev => ({ ...prev, status: 'failed' })); setErr(b.error); setBusy(false); return; }
      setRun(prev => ({ ...prev, completed: b.completedBatches }));
      if (b.done) {
        const dl = await getBuildDownloadUrl(r.buildId);
        setRun(prev => ({ ...prev, status: 'done', zipUrl: dl.ok ? dl.url : null }));
        if (!dl.ok) setErr(dl.error);
      }
    }
    setBusy(false);
    setBuilds(bs => [{ id: r.buildId, partner_name: partners.find(p => p.id === partnerId)?.full_name, widget_count: slugs.length, package_name: packageName, status: 'done', built_at: new Date().toISOString(), zip_path: 'x' }, ...bs]);
  }

  async function download(id) {
    const r = await getBuildDownloadUrl(id);
    if (r.ok) window.open(r.url, '_blank'); else setErr(r.error);
  }
  async function rebuild(id) {
    setErr(''); setBusy(true);
    const r = await rebuildFromHistory(id);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setRun({ buildId: r.buildId, total: r.totalBatches, completed: 0, status: 'building', startedAt: Date.now(), zipUrl: null });
    for (let i = 0; i < r.totalBatches; i++) {
      const b = await runBuildBatch(r.buildId, i);
      if (!b.ok) { setErr(b.error); return; }
      setRun(prev => ({ ...prev, completed: b.completedBatches }));
      if (b.done) { const dl = await getBuildDownloadUrl(r.buildId); setRun(prev => ({ ...prev, status: 'done', zipUrl: dl.ok ? dl.url : null })); }
    }
  }

  return (
    <>
      <div className="page-head"><div><h1>Build Manager</h1><p>Compile widget ber-watermark untuk partner — setiap SVG disisipi ID tersembunyi sebelum di-zip.</p></div></div>
      {!hasSecret && <div className="notice warn" style={{ marginBottom: 14 }}><Icon name="warning" size={18} />WATERMARK_SECRET belum diatur di Vercel env — tambahkan dulu (string acak panjang) sebelum build pertama.</div>}
      {err && <div className="notice err" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="actions" style={{ marginTop: 0 }}>
          <select value={partnerId} onChange={e => setPartnerId(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">Pilih partner…</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}{p.partner_unique_id ? ` (${p.partner_unique_id})` : ''}</option>)}
          </select>
          <select defaultValue="" onChange={e => pickPackage(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">Isi dari package…</option>
            {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.widget_slugs.length} widget)</option>)}
          </select>
          <input placeholder="Nama paket (opsional, buat catatan)" value={packageName} onChange={e => setPackageName(e.target.value)} style={{ minWidth: 200 }} />
        </div>

        <input placeholder="Cari widget…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        <div className="checks" style={{ maxHeight: 260, overflowY: 'auto', display: 'block' }}>
          {filtered.map(w => (
            <label key={w.slug} style={{ display: 'inline-flex', margin: '2px 4px' }}>
              <input type="checkbox" checked={selected.has(w.slug)} onChange={() => toggle(w.slug)} />{w.name}
            </label>
          ))}
          {!filtered.length && <span className="muted">Tidak ada widget cocok.</span>}
        </div>

        <div className="actions" style={{ alignItems: 'center' }}>
          <button className="btn btn-filled" disabled={busy || !partnerId || !selected.size} onClick={start}>
            <Icon name="lock" size={16} />Mulai Build ({selected.size} widget{selected.size > BATCH_SIZE ? `, ${Math.ceil(selected.size / BATCH_SIZE)} batch` : ''})
          </button>
          {selected.size > 0 && <button className="btn btn-text" disabled={busy} onClick={() => setSelected(new Set())}>Kosongkan pilihan</button>}
        </div>

        {run && (
          <div className="card-flat" style={{ marginTop: 12 }}>
            <ProgressBar completed={run.completed} total={run.total} startedAt={run.startedAt} />
            {run.status === 'done' && run.zipUrl && <a className="btn btn-sm btn-filled" href={run.zipUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}><Icon name="download" size={16} />Download ZIP</a>}
            {run.status === 'failed' && <p className="notice err" style={{ marginTop: 10 }}>Build gagal, lihat pesan error di atas.</p>}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Riwayat build</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Waktu</th><th>Partner</th><th>Paket</th><th>Jumlah widget</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {builds.map(b => (
                <tr key={b.id}>
                  <td>{fmtDate(b.built_at)}</td>
                  <td>{b.partner_name}<br /><span className="muted small">{b.partner_unique_id}</span></td>
                  <td>{b.package_name || '-'}</td>
                  <td>{b.widget_count}</td>
                  <td><span className={'chip ' + (b.status === 'done' ? 'ok' : b.status === 'failed' ? 'warn' : '')}>{STATUS_LABEL[b.status] || b.status}</span></td>
                  <td className="row-actions">
                    {b.status === 'done' && b.zip_path && <button className="btn btn-sm" onClick={() => download(b.id)}><Icon name="download" size={14} />Unduh</button>}
                    {b.status === 'done' && !b.zip_path && <button className="btn btn-sm" disabled={busy} onClick={() => rebuild(b.id)}>ZIP sudah expired — Build ulang</button>}
                  </td>
                </tr>
              ))}
              {!builds.length && <tr><td colSpan={6} className="muted">Belum ada riwayat build.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
