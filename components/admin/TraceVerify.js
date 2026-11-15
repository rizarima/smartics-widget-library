'use client';
import { useRef, useState } from 'react';
import Icon from '../Icon';
import { useLang } from '../LangProvider';
import { traceWatermark } from '@/lib/build-actions';

export default function TraceVerify() {
  const { lang, t } = useLang();
  const localeMap = { id: 'id-ID', en: 'en-US', vi: 'vi-VN' };
  const fmtDate = d => new Date(d).toLocaleString(localeMap[lang] || 'id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  async function scan(file) {
    setErr(''); setResult(null);
    if (!file) return;
    if (!/\.svg$/i.test(file.name)) { setErr(t('adm.trace.onlySvg')); return; }
    setBusy(true);
    try {
      const text = await file.text();
      const r = await traceWatermark(text);
      if (!r.ok) setErr(r.error); else setResult(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><div><h1>{t('adm.trace.title')}</h1><p>{t('adm.trace.lead')}</p></div></div>
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
          <p style={{ margin: '8px 0 0' }}>{busy ? t('adm.trace.scanning') : t('adm.trace.dropHint')}</p>
          <input ref={inputRef} type="file" accept=".svg,image/svg+xml" hidden onChange={e => scan(e.target.files?.[0])} />
        </div>
      </div>

      {result && (
        <div className="card">
          {!result.found && <div className="notice warn"><Icon name="warning" size={18} />{t('adm.trace.notFound')}</div>}
          {result.found && !result.valid && <div className="notice err"><Icon name="warning" size={18} />{t('adm.trace.invalid')}</div>}
          {result.found && result.valid && !result.matched && <div className="notice warn"><Icon name="warning" size={18} />{t('adm.trace.notMatched', { id: result.watermarkId })}</div>}
          {result.found && result.valid && result.matched && (
            <>
              <div className="notice err" style={{ marginBottom: 16 }}><Icon name="warning" size={18} />{t('adm.trace.identified')}</div>
              <table className="table">
                <tbody>
                  <tr><th>{t('adm.trace.partner')}</th><td>{result.build.partner_name} ({result.build.partner_unique_id})</td></tr>
                  <tr><th>{t('adm.trace.package')}</th><td>{result.build.package_name || '-'}</td></tr>
                  <tr><th>{t('adm.trace.widgetCount')}</th><td>{result.build.widget_count}</td></tr>
                  <tr><th>{t('adm.trace.buildDate')}</th><td>{fmtDate(result.build.built_at)}</td></tr>
                  <tr><th>{t('adm.trace.builtBy')}</th><td>{result.build.built_by_name}</td></tr>
                  <tr><th>{t('adm.trace.watermarkId')}</th><td><code>{result.watermarkId}</code></td></tr>
                </tbody>
              </table>
              <p className="muted small" style={{ marginTop: 14 }}>{t('adm.trace.suggestion')}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
