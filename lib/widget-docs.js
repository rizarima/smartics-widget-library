// rules shared with scripts/build-data.py: categories, widget kinds, template texts, property docs
import RULES from '@/data/widget-rules.json';

export const CAT_RULES = RULES.categories;
export const KIND_RULES = RULES.kinds;
export const TEMPLATE_TEXT = RULES.templates;
export const PROP_DOCS = RULES.propDocs;

export const slugify = s => String(s).toLowerCase().replace(/\.svg$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const prettyName = base => base.replace(/\.svg$/i, '').split(/[_\s-]+/).filter(Boolean).map(x => (x.toLowerCase() === '3d' ? '3D' : x[0].toUpperCase() + x.slice(1))).join(' ');

export function guessCategories(key) {
  const c = CAT_RULES.filter(([, p]) => new RegExp(p).test(key)).map(([c]) => c);
  return c.length ? c : ['Production'];
}
export function guessKind(key) {
  const k = KIND_RULES.find(([p]) => new RegExp(p).test(key));
  return k ? { kind: k[1], text: k[2] } : { kind: 'Equipment', text: 'Equipment proses.' };
}

// properties JSON + Indonesian labels -> rows for the "Properties" table
export function describeProperties(props, tr) {
  return props.map(p => {
    const lab = p.label || p.name;
    let type = p.type;
    if (type === 'parameter') type = `parameter (${(p.options?.type || []).join('/')}, ${p.options?.access || 'R'})`;
    else if (type === 'object') type = 'color condition';
    else if (p.component?.type === 'Rotation') type = 'rotation';
    const dv = p.options?.defaultValue;
    return { name: p.name, label: tr[lab] || lab, type, default: dv != null && typeof dv !== 'object' ? dv : null, desc: PROP_DOCS[p.name] || '' };
  });
}
