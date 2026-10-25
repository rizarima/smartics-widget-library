# Build data/widgets.json + data/widget-svgs.json + public/previews from converted SmartICS SVG widgets.
# usage: python3 scripts/build-data.py [--append] "<dir>=<template>@<date>" ["<dir>=<template>@<date>" ...]
#   template: "Template 1 - Indikator" | "Template 2 - Tank level" | "Template 3 - Pipa" | "Template 4 - Conveyor"
#   --append keeps the widgets already in data/ (a new file with the same slug replaces the old one)
# example: python3 scripts/build-data.py --append "../Batch 2/Pipe=Template 3 - Pipa@2026-10-25"
import os, re, sys, json

RULES = json.load(open('data/widget-rules.json', encoding='utf-8'))
TEMPLATE_TEXT = RULES['templates']

def alias(base):
    return ' '.join(x.upper() if x.lower() == '3d' else (x[:1].upper() + x[1:]) for x in re.split(r'[_\s-]+', base) if x)

def categories(key):
    return [c for c, p in RULES['categories'] if re.search(p, key)] or ['Production']

def kind(key):
    return next(((l, e) for p, l, e in RULES['kinds'] if re.search(p, key)), ('Equipment', 'Equipment proses.'))

def entry(path, template, date):
    svg = open(path, encoding='utf-8').read()
    svg = re.sub(r'\s*<metadata>.*?</metadata>', '', svg, flags=re.S)
    base = os.path.basename(path)[:-4]
    slug = re.sub(r'[^a-z0-9]+', '-', base.lower()).strip('-')
    key = base.lower()
    name = ('Tank ' + base.replace('-', ' ')) if re.match(r'group', key) else alias(base.replace('(1)', 'B'))
    props = json.loads(re.search(r'<properties>(.*?)</properties>', svg, re.S).group(1))
    tr = json.loads(re.search(r'<translations>(.*?)</translations>', svg, re.S).group(1)).get('id', {})
    plist = []
    for p in props:
        lab = p.get('label', p['name'])
        typ = p['type']
        if typ == 'parameter': typ = 'parameter (' + '/'.join(p['options']['type']) + ', ' + p['options'].get('access', 'R') + ')'
        elif typ == 'object': typ = 'color condition'
        elif p.get('component', {}).get('type') == 'Rotation': typ = 'rotation'
        dv = p.get('options', {}).get('defaultValue')
        plist.append({'name': p['name'], 'label': tr.get(lab, lab), 'type': typ,
                      'default': dv if not isinstance(dv, (list, dict)) else None,
                      'desc': RULES['propDocs'].get(p['name'], '')})
    k = kind(key)
    return {'slug': slug, 'name': name, 'kind': k[0], 'categories': categories(key), 'template': template,
            'description': ' '.join(x for x in [k[1], TEMPLATE_TEXT.get(template, ''), 'Ukuran default 100 x 100 dan siap diimport ke SmartICS.'] if x),
            'properties': plist, 'file_name': base + '.svg', 'created_at': date}, svg

args = sys.argv[1:]
append = '--append' in args
widgets, svgs = {}, {}
if append:
    for w in json.load(open('data/widgets.json', encoding='utf-8')):
        w['categories'] = categories(w['file_name'][:-4].lower())
        widgets[w['slug']] = w
    svgs = json.load(open('data/widget-svgs.json', encoding='utf-8'))
for a in (x for x in args if x != '--append'):
    d, rest = a.split('=', 1)
    template, date = rest.split('@')
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.svg'): continue
        w, svg = entry(os.path.join(d, fn), template, date)
        if w['slug'] in widgets: print('slug sudah ada, diganti:', w['slug'])
        widgets[w['slug']] = w; svgs[w['slug']] = svg

out = sorted(widgets.values(), key=lambda w: (w['created_at'], w['name']), reverse=True)
json.dump({w['slug']: svgs[w['slug']] for w in out}, open('data/widget-svgs.json', 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(out, open('data/widgets.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'widgets', {c: sum(c in w['categories'] for w in out) for c, _ in RULES['categories']})

# static thumbnails for the cards: drop everything conditional (labels, badges, scale, animations), tanks half full
import xml.etree.ElementTree as ET
SVGNS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVGNS)
os.makedirs('public/previews', exist_ok=True)
for w in out:
    root = ET.fromstring(svgs[w['slug']].encode('utf-8'))
    def clean(el):
        for c in list(el):
            if c.get('v-if') is not None or c.tag.endswith('}server') or c.tag.endswith('}metadata'):
                el.remove(c); continue
            clean(c)
        for k in list(el.attrib):
            if k.startswith('{https://vuejs.org') or k.startswith('v-'):
                # a bound colour has no static fallback: show the original black
                for a in ('fill', 'stroke'):
                    if k.endswith(':' + a) or k.endswith('}' + a):
                        el.attrib.setdefault(a, '#000000')
                del el.attrib[k]
        if el.tag == f'{{{SVGNS}}}rect' and el.get('y') == '-1' and el.get('x') == '-0.5':
            el.set('height', '1.55'); el.set('fill', '#2196F3')
    clean(root)
    open(f'public/previews/{w["slug"]}.svg', 'w', encoding='utf-8').write(ET.tostring(root, encoding='unicode'))
print('previews', len(out))
