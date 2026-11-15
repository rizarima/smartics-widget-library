'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '../Icon';
import { useLang } from '../LangProvider';
import { saveWidget, updateWidgetMeta, deleteWidget, getWidgetProps } from '@/lib/admin-actions';
import PropsEditor, { missingDesc } from './PropsEditor';
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

function parseWidget(file, text, t) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(t('adm.widget.invalidSvg'));
  const pm = /<properties>([\s\S]*?)<\/properties>/.exec(text);
  if (!/<server[\s>]/.test(text) || !pm) throw new Error(t('adm.widget.notSmartics'));
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
    description: [k.text, TEMPLATE_TEXT[template], t('adm.widget.defaultSizeNote')].filter(Boolean).join(' '),
    properties: describeProperties(props, tr), file_name: base + '.svg', svg: text, preview_svg: makePreview(doc),
  };
}

function Cats({ value, onChange }) {
  return <div className="checks">{CATEGORIES.map(c => <label key={c.id}><input type="checkbox" checked={value.includes(c.id)} onChange={e => onChange(e.target.checked ? [...value, c.id] : value.filter(x => x !== c.id))} />{c.label}</label>)}</div>;
}

function PropsBox({ value, onChange, open, t }) {
  const todo = missingDesc(value);
  return (
    <details className="props-box" open={open}>
      <summary><Icon name="edit" size={16} />{t('adm.widget.properties')} ({value.length}){todo > 0 ? <span className="chip warn">{todo} {t('adm.widget.propsMissing')}</span> : value.length ? <span className="chip ok">{t('adm.widget.propsComplete')}</span> : null}</summary>
      <div><PropsEditor value={value} onChange={onChange} /></div>
    </details>
  );
}

function UploadCard({ w, replaces, onChange, onRemove, t }) {
  return (
    <div className="upl-card">
      <div className="upl-head">
        <img alt="" src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(w.preview_svg)} />
        <div style={{ minWidth: 0 }}>
          <h3>{w.name || w.slug}</h3>
          <div className="chips">
            <span className="chip"><code>{w.file_name}</code></span>
            <span className={'chip t' + ((w.template || '').match(/Template (\d)/)?.[1] || '1')}>{w.template}</span>
            {replaces && <span className="chip warn">{t('adm.widget.replacesExisting')}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-text btn-icon" title={t('adm.widget.removeFromList')} aria-label={t('adm.widget.removeFromList')} onClick={onRemove}><Icon name="close" /></button>
      </div>
      <div className="upl-body form">
        <div className="row">
          <label>{t('adm.widget.name')}<input value={w.name} onChange={e => onChange({ name: e.target.value })} /></label>
          <label>{t('adm.widget.kind')}<input value={w.kind} onChange={e => onChange({ kind: e.target.value })} /></label>
        </div>
        <div className="field">{t('adm.widget.category')}<Cats value={w.categories} onChange={v => onChange({ categories: v })} /></div>
        <label>{t('adm.widget.description')}<textarea rows={2} value={w.description} onChange={e => onChange({ description: e.target.value })} /></label>
        <PropsBox value={w.properties} onChange={v => onChange({ properties: v })} open={missingDesc(w.properties) > 0} t={t} />
      </div>
    </div>
  );
}

export default function WidgetAdmin({ widgets, me }) {
  const { t } = useLang();
  const SOURCES = [['all', t('adm.widget.srcAll')], ['mine', t('adm.widget.srcMine')], ['others', t('adm.widget.srcOthers')], ['bawaan', t('adm.widget.srcBawaan')]];
  const router = useRouter();
  const [busy, start] = useTransition();
  const [uploads, setUploads] = useState([]);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('all');
  const [edit, setEdit] = useState(null);
  const existing = useMemo(() => new Map(widgets.map(w => [w.slug, w])), [widgets]);

  const onFiles = async files => {
    const out = [];
    for (const f of files) {
      try { out.push(parseWidget(f, await f.text(), t)); } catch (e) { out.push({ error: `${f.name}: ${e.message}`, slug: f.name }); }
    }
    setUploads(u => [...u, ...out]);
  };
  const setU = (i, patch) => setUploads(u => u.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const good = uploads.filter(x => !x.error);
  const saveAll = () => start(async () => {
    const ok = [], bad = [], keep = [];
    for (const w of good) { const r = await saveWidget(w); if (r.ok) ok.push(w.name); else { bad.push(`${w.name}: ${r.error}`); keep.push(w); } }
    setMsg(bad.length ? { err: bad.join(' · ') } : { ok: t('adm.widget.savedN', { n: ok.length }) });
    setUploads(keep);
    router.refresh();
  });
  const run = fn => start(async () => { const r = await fn(); if (!r.ok) setMsg({ err: r.error }); else { setMsg(null); setEdit(null); router.refresh(); } });
  const openEdit = w => {
    setEdit({ slug: w.slug, name: w.name, kind: w.kind || '', categories: w.categories, description: w.description || '', properties: null });
    getWidgetProps(w.slug).then(r => setEdit(e => (e && e.slug === w.slug ? { ...e, properties: r.ok ? r.properties : [] } : e)));
  };
  const bySrc = w => src === 'all' || (src === 'mine' ? w.uploaded_by === me : src === 'others' ? !!w.uploaded_by && w.uploaded_by !== me : !w.uploaded_by);
  const shown = widgets.filter(w => bySrc(w) && (!q || w.name.toLowerCase().includes(q.toLowerCase())));
  const count = k => widgets.filter(w => k === 'all' || (k === 'mine' ? w.uploaded_by === me : k === 'others' ? !!w.uploaded_by && w.uploaded_by !== me : !w.uploaded_by)).length;

  return (
    <>
      <div className="page-head"><div><h1>{t('adm.widget.title')}</h1><p>{t('adm.widget.lead')}</p></div></div>
      {msg?.err && <div className="notice err" style={{ marginBottom: 12 }}>{msg.err}</div>}
      {msg?.ok && <div className="notice ok" style={{ marginBottom: 12 }}>{msg.ok}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-head"><h2><Icon name="upload" />{t('adm.widget.uploadTitle')}</h2></div>
        <label className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFiles([...e.dataTransfer.files].filter(f => /\.svg$/i.test(f.name))); }}>
          <Icon name="upload" size={32} /><br /><b>{t('adm.widget.dropzoneTitle')}</b><br /><span className="muted small">{t('adm.widget.dropzoneHint')}</span>
          <input type="file" accept=".svg,image/svg+xml" multiple hidden onChange={e => { onFiles([...e.target.files]); e.target.value = ''; }} />
        </label>
        {uploads.length > 0 && (
          <>
            <div className="upl-list">
              {uploads.map((w, i) => w.error
                ? <div key={i} className="notice err" style={{ justifyContent: 'space-between' }}><span>{w.error}</span><button className="btn btn-text btn-sm" onClick={() => setUploads(u => u.filter((_, j) => j !== i))}>{t('adm.widget.discard')}</button></div>
                : <UploadCard key={w.slug + i} w={w} replaces={existing.has(w.slug)} onChange={p => setU(i, p)} onRemove={() => setUploads(u => u.filter((_, j) => j !== i))} t={t} />)}
            </div>
            <div className="actions" style={{ marginBottom: 0 }}>
              <button className="btn btn-filled" disabled={busy || !good.length} onClick={saveAll}><Icon name="check" size={18} />{busy ? t('adm.widget.saving') : t('adm.widget.saveN', { n: good.length })}</button>
              <button className="btn btn-text" onClick={() => setUploads([])}>{t('adm.widget.cancelAll')}</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="section-head"><h2><Icon name="widgets" />{t('adm.widget.allN', { n: widgets.length })}</h2><div className="search"><Icon name="search" size={18} /><input placeholder={t('adm.widget.search')} value={q} onChange={e => setQ(e.target.value)} /></div></div>
        <div className="filters" style={{ marginBottom: 10 }}>
          {SOURCES.map(([k, l]) => <button key={k} className={'fchip' + (src === k ? ' on' : '')} onClick={() => setSrc(k)}>{l} <span className="count">{count(k)}</span></button>)}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th></th><th>{t('adm.widget.colName')}</th><th>{t('adm.widget.colCategory')}</th><th>{t('adm.widget.colUploadedBy')}</th><th>{t('adm.widget.colAction')}</th></tr></thead>
            <tbody>
              {shown.map(w => (
                <tr key={w.slug} style={w.hidden ? { opacity: .5 } : null}>
                  <td><img src={w.thumb} alt="" /></td>
                  <td><b>{w.name}</b><br /><span className="muted small">{w.kind}{w.hidden ? t('adm.widget.hiddenSuffix') : ''}</span></td>
                  <td className="small">{w.categories.join(', ')}</td>
                  <td className="small">
                    {w.uploaded_by_name ? <b>{w.uploaded_by_name}{w.uploaded_by === me ? t('adm.partner.you') : ''}</b> : <span className="chip">{w.source === 'diubah' ? t('adm.widget.builtinChanged') : t('adm.widget.builtin')}</span>}
                    {w.updated_by_name && w.updated_by_name !== w.uploaded_by_name && <><br /><span className="muted">{t('adm.widget.editedBy', { name: w.updated_by_name })}</span></>}
                  </td>
                  <td><div className="row-actions">
                    <Link className="btn btn-sm btn-text" href={`/widgets/${w.slug}`} target="_blank"><Icon name="eye" size={16} /></Link>
                    <button className="btn btn-sm" onClick={() => openEdit(w)}><Icon name="edit" size={16} />{t('adm.widget.edit')}</button>
                    <button className="btn btn-sm" disabled={busy} onClick={() => run(() => updateWidgetMeta(w.slug, { hidden: !w.hidden }))}><Icon name={w.hidden ? 'eye' : 'eyeoff'} size={16} />{w.hidden ? t('adm.widget.show') : t('adm.widget.hide')}</button>
                    {w.source !== 'bawaan' && <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirm(w.source === 'diubah' ? t('adm.widget.resetConfirm') : t('adm.widget.deleteConfirm')) && run(() => deleteWidget(w.slug))}><Icon name="delete" size={16} />{w.source === 'diubah' ? t('adm.widget.reset') : ''}</button>}
                  </div></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={5} className="muted">{t('adm.widget.none')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="backdrop" onClick={e => e.target === e.currentTarget && setEdit(null)}>
          <div className="modal wide">
            <h2>{t('adm.widget.editTitle')}</h2>
            <form className="form" onSubmit={e => { e.preventDefault(); const { slug, properties, ...patch } = edit; run(() => updateWidgetMeta(slug, properties ? { ...patch, properties } : patch)); }}>
              <div className="row">
                <label>{t('adm.widget.name')}<input required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
                <label>{t('adm.widget.kind')}<input value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })} /></label>
              </div>
              <div className="field">{t('adm.widget.category')}<Cats value={edit.categories} onChange={v => setEdit({ ...edit, categories: v })} /></div>
              <label>{t('adm.widget.description')}<textarea rows={4} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></label>
              {edit.properties ? <PropsBox value={edit.properties} onChange={v => setEdit({ ...edit, properties: v })} open={missingDesc(edit.properties) > 0} t={t} /> : <p className="muted small" style={{ margin: 0 }}>{t('adm.widget.loadingProps')}</p>}
              <p className="muted small" style={{ margin: 0 }}>{t('adm.widget.replaceHint')}</p>
              <div className="actions" style={{ margin: 0 }}>
                <button className="btn btn-filled" disabled={busy}><Icon name="check" size={18} />{t('adm.widget.save')}</button>
                <button type="button" className="btn btn-text" onClick={() => setEdit(null)}>{t('adm.widget.batal')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
