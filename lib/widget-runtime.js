// Mini renderer for SmartICS widgets (SVG compiled as a Vue template) used for the live simulation.
// Supports v-bind:*, v-if/v-show/v-else, v-on:click and {{ }} text, which is what the widgets use.

const GLOBALS = new Set(['Math', 'Number', 'String', 'Boolean', 'JSON', 'Date', 'Array', 'Object', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Infinity', 'NaN', 'undefined', 'console', 'Intl', 'Symbol', 'Map', 'Set']);
const cache = new Map();
function compile(src, stmt) {
  const k = (stmt ? 's:' : 'e:') + src;
  if (cache.has(k)) return cache.get(k);
  let f = null;
  try { f = new Function('__s', stmt ? `with(__s){ ${src}\n }` : `with(__s){ return (${src}\n); }`); } catch (e) { /* invalid expression */ }
  cache.set(k, f);
  return f;
}
const kebab = k => (k.startsWith('--') ? k : k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
function styleToCss(v) {
  if (v == null || v === false) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(styleToCss).filter(Boolean).join(';');
  if (typeof v === 'object') return Object.entries(v).filter(([, x]) => x != null && x !== '' && x !== false).map(([k, x]) => kebab(k) + ':' + x).join(';');
  return '';
}
function compileTpl(s) {
  const parts = []; let last = 0;
  s.replace(/\{\{([\s\S]+?)\}\}/g, (m, ex, i) => { parts.push(s.slice(last, i)); parts.push(compile(ex) || (() => '')); last = i + m.length; return m; });
  parts.push(s.slice(last));
  return parts;
}

export function parseProperties(text) {
  const m = /<properties>([\s\S]*?)<\/properties>/.exec(text);
  if (!m) return [];
  try { return JSON.parse(m[1]); } catch { try { return JSON.parse(m[1].replace(/,\s*([\]}])/g, '$1')); } catch { return []; } }
}

// colour condition (min/max/equal) like SmartICS colorConditionResolver
export function colorResolver(list) {
  const pick = vt => (list.find(x => x.valueType === vt) || {}).color;
  return {
    inherit: true, values: list,
    getColor(p) {
      if (!p) return pick('min') || null;
      const eq = list.find(x => x.valueType === 'equal' && String(x.value) === String(p.value));
      if (eq) return eq.color;
      let on;
      if (typeof p.value === 'boolean') on = p.value;
      else { const c = p.config || {}; const mn = c.outMin ?? 0, mx = c.outMax ?? 100; on = (Number(p.value) - mn) / ((mx - mn) || 1) >= 0.5; }
      return (on ? pick('max') : pick('min')) || null;
    },
  };
}

export function propDefault(d) {
  const o = d.options || {};
  if (d.type === 'object' && o.valueResolver === 'colorConditionResolver') {
    const vals = ((d.properties || []).find(x => x.name === 'values') || {}).options || {};
    return colorResolver(vals.defaultValue || []);
  }
  if ('defaultValue' in o) return o.defaultValue;
  if (d.type === 'boolean') return false;
  if (d.type === 'number') return 0;
  return '';
}

export function formatParam(p) {
  if (!p) return '';
  if (typeof p.value === 'boolean') return p.value ? 'ON' : 'OFF';
  if (typeof p.value === 'number') return p.value.toFixed(p.config?.precision ?? 1) + (p.config?.eu ? ' ' + p.config.eu : '');
  return String(p.value ?? '');
}

export function mountWidget(host, text, { onClick } = {}) {
  host.innerHTML = '';
  const xml = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (xml.getElementsByTagName('parsererror').length) { host.textContent = 'SVG tidak valid'; return null; }
  const svg = document.importNode(xml.documentElement, true);
  [...svg.querySelectorAll('*')].forEach(n => { if (n.localName === 'server' || n.localName === 'metadata') n.remove(); });
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  svg.style.display = 'block'; svg.style.overflow = 'visible';
  const binds = [], ifs = [], texts = [];
  let lastIf = null;
  const walk = el => {
    const ss = el.getAttribute('style') || '';
    for (const a of [...el.attributes]) {
      const n = a.name;
      if (n.startsWith('v-bind:')) { binds.push({ el, attr: n.slice(7), fn: compile(a.value), ss }); el.removeAttribute(n); }
      else if (n.startsWith('v-on:')) { if (n.startsWith('v-on:click')) el.addEventListener('click', () => onClick && onClick()); el.removeAttribute(n); }
      else if (n === 'v-if' || n === 'v-show' || n === 'v-else-if') { const it = { el, fn: compile(a.value), show: n === 'v-show', ph: document.createComment('if') }; ifs.push(it); lastIf = it; el.removeAttribute(n); }
      else if (n === 'v-else') { ifs.push({ el, elseOf: lastIf, ph: document.createComment('else') }); el.removeAttribute(n); }
      else if (n.startsWith('v-')) el.removeAttribute(n);
    }
    for (const c of [...el.childNodes]) {
      if (c.nodeType === 3 && c.nodeValue.includes('{{')) texts.push({ node: c, parts: compileTpl(c.nodeValue) });
      else if (c.nodeType === 1) walk(c);
    }
  };
  walk(svg);
  host.appendChild(svg);
  return {
    svg,
    update(vars) {
      const scope = new Proxy(vars, { has: (t, k) => typeof k === 'string' && !GLOBALS.has(k), get: (t, k) => (k === Symbol.unscopables ? undefined : t[k]) });
      for (const b of binds) {
        if (!b.fn) continue;
        let v; try { v = b.fn(scope); } catch { continue; }
        if (b.attr === 'style') { const css = [b.ss, styleToCss(v)].filter(Boolean).join(';'); if (b.el.getAttribute('style') !== css) b.el.setAttribute('style', css); }
        else if (v == null || v === false) b.el.removeAttribute(b.attr);
        else { const s = String(v); if (b.el.getAttribute(b.attr) !== s) b.el.setAttribute(b.attr, s); }
      }
      for (const t of texts) {
        const s = t.parts.map(p => (typeof p === 'string' ? p : (() => { try { const v = p(scope); return v == null ? '' : String(v); } catch { return ''; } })())).join('');
        if (t.node.nodeValue !== s) t.node.nodeValue = s;
      }
      for (const f of ifs) {
        let vis;
        if (f.elseOf) vis = !f.elseOf.last; else { try { vis = !!f.fn(scope); } catch { vis = false; } }
        f.last = vis;
        if (f.show) { f.el.style.display = vis ? '' : 'none'; continue; }
        if (vis && !f.el.isConnected && f.ph.parentNode) f.ph.replaceWith(f.el);
        else if (!vis && f.el.isConnected) f.el.replaceWith(f.ph);
      }
    },
  };
}
