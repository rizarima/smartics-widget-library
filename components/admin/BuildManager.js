'use client';
import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { useLang } from '../LangProvider';
import { startBuild, runBuildBatch, getBuildDownloadUrl, rebuildFromHistory } from '@/lib/build-actions';
import { BATCH_SIZE } from '@/lib/build-config';

function ProgressBar({ completed, total, startedAt, t }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const avgMs = completed > 0 ? (Date.now() - startedAt) / completed : null;
  const etaSec = avgMs && completed < total ? Math.round((avgMs * (total - completed)) / 1000) : 0;
  return (
    <div>
      <div className="progress-track"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
      <p className="muted small" style={{ margin: '6px 0 0' }}>
        {t('adm.build.batchProgress', { c: Math.min(completed, total), t: total, p: pct })}
        {completed < total && etaSec > 0 ? (etaSec < 60 ? t('adm.build.etaSec', { s: etaSec }) : t('adm.build.etaMin', { m: Math.ceil(etaSec / 60) })) : ''}
      </p>
    </div>
  );
}

export default function BuildManager({ widgets, packages, partners, builds: initialBuilds, hasSecret }) {
  const { lang, t } = useLang();
  const STATUS_LABEL = { pending: t('adm.build.statusPending'), building: t('adm.build.statusBuilding'), done: t('adm.build.statusDone'), failed: t('adm.build.statusFailed') };
  const localeMap = { id: 'id-ID', en: 'en-US', vi: 'vi-VN' };
  const fmtDate = d => new Date(d).toLocaleString(localeMap[lang] || 'id-ID', { dateStyle: 'medium', timeStyle: 'short' });
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
      <div className="page-head"><div><h1>{t('adm.build.title')}</h1><p>{t('adm.build.lead')}</p></div></div>
      {!hasSecret && <div className="notice warn" style={{ marginBottom: 14 }}><Icon name="warning" size={18} />{t('adm.build.secretWarn')}</div>}
      {err && <div className="notice err" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="actions" style={{ marginTop: 0 }}>
          <select value={partnerId} onChange={e => setPartnerId(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">{t('adm.build.pickPartner')}</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}{p.partner_unique_id ? ` (${p.partner_unique_id})` : ''}</option>)}
          </select>
          <select defaultValue="" onChange={e => pickPackage(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">{t('adm.build.pickPackage')}</option>
            {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.widget_slugs.length})</option>)}
          </select>
          <input placeholder={t('adm.build.packageNamePh')} value={packageName} onChange={e => setPackageName(e.target.value)} style={{ minWidth: 200 }} />
        </div>

        <input placeholder={t('adm.build.searchWidgetPh')} value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        <div className="checks" style={{ maxHeight: 260, overflowY: 'auto', display: 'block' }}>
          {filtered.map(w => (
            <label key={w.slug} style={{ display: 'inline-flex', margin: '2px 4px' }}>
              <input type="checkbox" checked={selected.has(w.slug)} onChange={() => toggle(w.slug)} />{w.name}
            </label>
          ))}
          {!filtered.length && <span className="muted">{t('adm.build.noWidgetsMatch')}</span>}
        </div>

        <div className="actions" style={{ alignItems: 'center' }}>
          <button className="btn btn-filled" disabled={busy || !partnerId || !selected.size} onClick={start}>
            <Icon name="lock" size={16} />{t('adm.build.start')}{selected.size > BATCH_SIZE ? t('adm.build.nWidgetsBatches', { n: selected.size, b: Math.ceil(selected.size / BATCH_SIZE) }) : t('adm.build.nWidgets', { n: selected.size })}
          </button>
          {selected.size > 0 && <button className="btn btn-text" disabled={busy} onClick={() => setSelected(new Set())}>{t('adm.build.clearSelection')}</button>}
        </div>

        {run && (
          <div className="card-flat" style={{ marginTop: 12 }}>
            <ProgressBar completed={run.completed} total={run.total} startedAt={run.startedAt} t={t} />
            {run.status === 'done' && run.zipUrl && <a className="btn btn-sm btn-filled" href={run.zipUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}><Icon name="download" size={16} />{t('adm.build.download')}</a>}
            {run.status === 'failed' && <p className="notice err" style={{ marginTop: 10 }}>{t('adm.build.failed')}</p>}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('adm.build.history')}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>{t('adm.build.colTime')}</th><th>{t('adm.build.colPartner')}</th><th>{t('adm.build.colPackage')}</th><th>{t('adm.build.colCount')}</th><th>{t('adm.build.colStatus')}</th><th>{t('adm.build.colAction')}</th></tr></thead>
            <tbody>
              {builds.map(b => (
                <tr key={b.id}>
                  <td>{fmtDate(b.built_at)}</td>
                  <td>{b.partner_name}<br /><span className="muted small">{b.partner_unique_id}</span></td>
                  <td>{b.package_name || '-'}</td>
                  <td>{b.widget_count}</td>
                  <td><span className={'chip ' + (b.status === 'done' ? 'ok' : b.status === 'failed' ? 'warn' : '')}>{STATUS_LABEL[b.status] || b.status}</span></td>
                  <td className="row-actions">
                    {b.status === 'done' && b.zip_path && <button className="btn btn-sm" onClick={() => download(b.id)}><Icon name="download" size={14} />{t('adm.build.downloadBtn')}</button>}
                    {b.status === 'done' && !b.zip_path && <button className="btn btn-sm" disabled={busy} onClick={() => rebuild(b.id)}>{t('adm.build.expiredRebuild')}</button>}
                  </td>
                </tr>
              ))}
              {!builds.length && <tr><td colSpan={6} className="muted">{t('adm.build.noHistory')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
