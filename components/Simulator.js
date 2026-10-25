'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { mountWidget, parseProperties, propDefault, colorResolver, formatParam } from '@/lib/widget-runtime';
import { useLang } from './LangProvider';

const LIMITS = { outMin: 0, outMax: 100, hihi: 90, hi: 75, lo: 25, lolo: 10 };
const ALARMS = [['auto', 'sim.auto'], ['none', 'sim.normal'], ['hihi', 'HiHi'], ['hi', 'Hi'], ['lo', 'Lo'], ['lolo', 'LoLo']];

// "#RRGGBBAA" <-> <input type=color>
const hex6 = c => (/^#[0-9a-f]{6}/i.test(c || '') ? c.slice(0, 7) : '#000000');
const withAlpha = (c, old) => c + (/^#[0-9a-f]{8}$/i.test(old || '') ? old.slice(7) : 'FF');

function translations(svg) {
  const m = /<translations>([\s\S]*?)<\/translations>/.exec(svg);
  try { return JSON.parse(m[1]).id || {}; } catch { return {}; }
}

function makeParam(name, s, label) {
  const numeric = s.mode === 'number';
  const v = numeric ? Number(s.value) : !!s.value;
  let f = { fhihi: false, fhi: false, flo: false, flolo: false };
  if (s.alarm === 'auto') {
    if (numeric) f = { fhihi: v >= LIMITS.hihi, fhi: v >= LIMITS.hi && v < LIMITS.hihi, flo: v <= LIMITS.lo && v > LIMITS.lolo, flolo: v <= LIMITS.lolo };
  } else if (s.alarm !== 'none') f[{ hihi: 'fhihi', hi: 'fhi', lo: 'flo', lolo: 'flolo' }[s.alarm]] = true;
  const fAlarm = f.fhihi || f.flolo || f.fhi || f.flo;
  return {
    __name: name, value: v, quality: !s.bad, ...f, fAlarm, fAck: fAlarm && !s.acked,
    config: { alias: label, eu: numeric ? '%' : '', precision: 1, ...LIMITS, ehihi: true, ehi: true, elo: true, elolo: true },
  };
}

// labels: property label key -> text in the visitor's language (falls back to the widget's own Indonesian labels)
export default function Simulator({ svg, name, labels = {} }) {
  const { t } = useLang();
  const host = useRef(null), rt = useRef(null);
  const defs = useMemo(() => parseProperties(svg), [svg]);
  const tr = useMemo(() => translations(svg), [svg]);
  const lab = d => labels[d.label || d.name] || tr[d.label || d.name] || d.label || d.name;
  const optLab = l => labels[l] || tr[l] || l;
  const params = defs.filter(d => d.type === 'parameter');
  const settings = defs.filter(d => d.type !== 'parameter');

  const [sim, setSim] = useState(() => Object.fromEntries(params.map((d, i) => {
    const t = d.options?.type || [];
    const numeric = !t.includes('Boolean') || d.name === 'level';
    return [d.name, { mode: numeric ? 'number' : 'bool', value: i === 0 ? (numeric ? 55 : true) : 1, alarm: i === 0 ? 'auto' : 'none', bad: false, acked: false }];
  })));
  const [props, setProps] = useState(() => Object.fromEntries(settings.map(d => [d.name, propDefault(d)])));
  const [toast, setToast] = useState('');

  useEffect(() => {
    rt.current = mountWidget(host.current, svg, { onClick: () => { setToast(t('sim.click')); setTimeout(() => setToast(''), 1800); } });
  }, [svg]);

  useEffect(() => {
    if (!rt.current) return;
    const vars = { ...props, format: formatParam, openDetails: () => {}, toggle: () => {}, setValue: () => {}, input: () => {} };
    params.forEach(d => (vars[d.name] = makeParam(d.name, sim[d.name], d.name === params[0].name ? name : lab(d))));
    rt.current.update(vars);
  });

  const setS = (n, k, v) => setSim(s => ({ ...s, [n]: { ...s[n], [k]: v } }));
  const setP = (n, v) => setProps(p => ({ ...p, [n]: v }));

  const control = d => {
    const v = props[d.name];
    if (d.component?.type === 'Rotation') return <span><input type="range" min="0" max="360" step="15" value={+v || 0} onChange={e => setP(d.name, +e.target.value)} /> {+v || 0}°</span>;
    if (d.type === 'boolean') return <input type="checkbox" checked={!!v} onChange={e => setP(d.name, e.target.checked)} />;
    if (d.type === 'color') return <input type="color" value={hex6(v)} onChange={e => setP(d.name, withAlpha(e.target.value, v))} />;
    if (d.type === 'enum') return <select value={v} onChange={e => setP(d.name, e.target.value)}>{(d.options?.options || []).map(o => <option key={o.value} value={o.value}>{optLab(o.label)}</option>)}</select>;
    if (d.type === 'number') return <input type="number" style={{ width: 90 }} value={v} onChange={e => setP(d.name, e.target.value === '' ? '' : +e.target.value)} />;
    if (d.type === 'object' && v?.values) {
      const set = (i, c) => setP(d.name, colorResolver(v.values.map((x, j) => (j === i ? { ...x, color: withAlpha(c, x.color) } : x))));
      return <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{v.values.map((x, i) => <label key={i} className="small muted" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>{x.valueType}<input type="color" value={hex6(x.color)} onChange={e => set(i, e.target.value)} /></label>)}</span>;
    }
    return null;
  };

  return (
    <div>
      <div className="section-head"><h2>{t('sim.title')}</h2><span className="muted small">{t('sim.hint')}</span></div>
      <div className="sim-stage"><div ref={host} /></div>
      <div className="sim-controls">
        {params.map((d, i) => {
          const s = sim[d.name];
          return (
            <div key={d.name} className="ctl-group">
              <h3>{lab(d)}</h3>
              {i === 0 && (d.options?.type || []).includes('Boolean') && d.name !== 'level' && (
                <div className="ctl"><span>{t('sim.valueType')}</span><div className="seg">{[['bool', 'Boolean'], ['number', t('sim.number')]].map(([m, l]) => <button key={m} className={s.mode === m ? 'on' : ''} onClick={() => setSim(x => ({ ...x, [d.name]: { ...s, mode: m, value: m === 'number' ? 55 : true } }))}>{l}</button>)}</div></div>
              )}
              {s.mode === 'number' ? (
                <div className="ctl"><span>{t('sim.value')}</span><span><input type="range" min="0" max="100" value={s.value} onChange={e => setS(d.name, 'value', +e.target.value)} /> {s.value}</span></div>
              ) : (
                <div className="ctl"><span>{t('sim.value')}</span><div className="seg">{d.name === 'autoManual' ? [[1, 'Auto'], [0, 'Manual']].map(([x, l]) => <button key={l} className={!!s.value === !!x ? 'on' : ''} onClick={() => setS(d.name, 'value', x)}>{l}</button>) : [[true, 'ON'], [false, 'OFF']].map(([x, l]) => <button key={l} className={s.value === x ? 'on' : ''} onClick={() => setS(d.name, 'value', x)}>{l}</button>)}</div></div>
              )}
              {i === 0 && (
                <>
                  <div className="ctl"><span>{t('sim.alarm')} {s.alarm === 'auto' && s.mode === 'number' ? <span className="muted small">(LoLo 10 · Lo 25 · Hi 75 · HiHi 90)</span> : null}</span>
                    <div className="seg">{ALARMS.filter(([a]) => a !== 'auto' || s.mode === 'number').map(([a, l]) => <button key={a} className={s.alarm === a ? 'on' : ''} onClick={() => setS(d.name, 'alarm', a)}>{t(l)}</button>)}</div></div>
                  <div className="ctl"><span>{t('sim.acked')}</span><input type="checkbox" checked={s.acked} onChange={e => setS(d.name, 'acked', e.target.checked)} /></div>
                  <div className="ctl"><span>{t('sim.bad')}</span><input type="checkbox" checked={s.bad} onChange={e => setS(d.name, 'bad', e.target.checked)} /></div>
                </>
              )}
            </div>
          );
        })}
        <div className="ctl-group">
          <h3>{t('sim.props')}</h3>
          {settings.map(d => <div key={d.name} className="ctl"><span>{lab(d)}</span>{control(d)}</div>)}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
