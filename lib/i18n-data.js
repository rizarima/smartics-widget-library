// translated widget descriptions/properties and sample posts (server side; the data files are too big for the browser)
import W from '@/data/i18n-widgets.json';
import C from '@/data/content-i18n.json';
import RULES from '@/data/widget-rules.json';

// ---------- widget texts (generated from data/widget-rules.json, so they can be rebuilt per language) ----------
const ID_LABEL_KEY = Object.fromEntries(Object.entries(W.id.labels).map(([k, v]) => [v, k]));
export const widgetLabel = (lang, key, fallback) => (lang !== 'id' && W[lang]?.labels?.[key]) || fallback;
export const templateName = (lang, tpl) => (lang !== 'id' && W[lang]?.templates?.[tpl]?.[0]) || tpl;
export const kindName = (lang, kind) => (lang !== 'id' && W[lang]?.kinds?.[kind]?.[0]) || kind;
export const categoryDesc = (lang, c) => (lang !== 'id' && W[lang]?.categories?.[c.id]) || c.desc;

export const widgetLabels = lang => W[lang]?.labels || W.id.labels;

export function localizeWidget(w, lang, rules = RULES) {
  if (!w || lang === 'id' || !W[lang]) return w;
  const L = W[lang];
  const kindRule = rules.kinds.find(([, l]) => l === w.kind);
  const idText = kindRule ? kindRule[2] : 'Equipment proses.';
  const idDesc = [idText, rules.templates[w.template] || '', 'Ukuran default 100 x 100 dan siap diimport ke SmartICS.'].filter(Boolean).join(' ');
  const out = { ...w, kind: kindName(lang, w.kind) };
  // only the generated description is translated; a description written in Admin stays as written
  if (w.description === idDesc) out.description = [L.kinds[w.kind]?.[1] || idText, L.templates[w.template]?.[1] || '', L.size].filter(Boolean).join(' ');
  if (w.properties) out.properties = w.properties.map(p => ({
    ...p,
    label: widgetLabel(lang, ID_LABEL_KEY[p.label], p.label),
    desc: p.desc && p.desc === rules.propDocs[p.name] ? L.propDocs[p.name] || p.desc : p.desc,
  }));
  return out;
}

// sample posts are translated by their Indonesian title; posts written in Admin are shown as written
export function localizePost(x, lang) {
  const tr = lang !== 'id' && C[lang]?.[x?.title || x?.name];
  if (!tr) return x;
  return { ...x, ...(tr.title && x.title ? { title: tr.title } : {}), ...(tr.description ? { description: tr.description } : {}), ...(tr.body ? { body: tr.body } : {}) };
}
