# Build data/widgets.json from the converted SmartICS SVG widgets.
# usage: python3 scripts/build-data.py <dir-with-svgs> [<more dirs>...]
import os, re, sys, json, datetime

CATS = [  # (category, name patterns)
    ('WTP', r'tank|group|pump|valve|checkvalve|pressure_regulator|pulsation|peristaltic|meter|gauge'),
    ('Power', r'turbine|compressor|electrocell|condensor|reboiler|heatexchang|pipe_3d_heatexchange'),
    ('Production', r'reactor|heatexchang|reboiler|condensor|pumphead|peristaltic|valve_3d_3way|valve_3d_4way|tank_3d_large|tank_3d_medium'),
    ('Piping', r'pipe|flange|reducer|elbow|tjunction|redirect|nopipe'),
    ('Instrumentation', r'meter|gauge|pressure_regulator|checkvalve'),
]
KIND = [  # (pattern, label, short explanation)
    (r'tank|^group', 'Tangki', 'Tangki penyimpanan dengan level cairan yang naik-turun mengikuti tag.'),
    (r'checkvalve', 'Check valve', 'Check valve (katup satu arah) untuk menandai status aliran.'),
    (r'valve', 'Valve', 'Valve/katup untuk menampilkan status buka-tutup atau posisi.'),
    (r'pumphead', 'Pump head', 'Kepala pompa (pump head) untuk proses dosing/transfer.'),
    (r'peristaltic', 'Peristaltic pump', 'Bagian pompa peristaltik untuk dosing kimia.'),
    (r'pump', 'Pompa', 'Pompa untuk menampilkan status run/stop dan alarm.'),
    (r'turbine', 'Turbin', 'Turbin untuk status pembangkit/penggerak.'),
    (r'compressor', 'Kompresor', 'Kompresor untuk status run/stop dan alarm.'),
    (r'electrocell', 'Electrocell', 'Sel elektrolisis untuk proses kimia/listrik.'),
    (r'condensor', 'Kondensor', 'Kondensor untuk proses pendinginan uap.'),
    (r'reboiler', 'Reboiler', 'Reboiler untuk proses pemanasan kolom.'),
    (r'heatexchang', 'Heat exchanger', 'Heat exchanger untuk proses perpindahan panas.'),
    (r'reactor', 'Reaktor', 'Packed bed reactor untuk proses produksi.'),
    (r'meter', 'Meter', 'Flow meter / meter proses.'),
    (r'gauge', 'Gauge', 'Gauge (indikator dial) untuk tekanan/nilai proses.'),
    (r'pressure_regulator', 'Pressure regulator', 'Regulator tekanan.'),
    (r'pulsation', 'Pulsation dampener', 'Peredam pulsasi pada jalur pompa.'),
    (r'flange', 'Flange', 'Sambungan flange pipa.'),
    (r'reducer', 'Reducer', 'Reducer pipa (perubahan diameter).'),
    (r'pipe|elbow|tjunction|redirect', 'Pipa', 'Pipa/sambungan pipa untuk menampilkan aliran.'),
]
# what each property lets the user do
PDOC = {
    'indicator': 'Tag utama widget (Boolean/Float/Integer). Warna bagian indikator dan semua alarm membaca tag ini.',
    'level': 'Tag level (Float/Integer). Tinggi cairan di dalam tangki mengikuti nilai tag ini.',
    'autoManual': 'Tag Auto/Manual (1 = Auto, 0 = Manual). Dipakai badge A/M di pojok kanan bawah.',
    'shapeColor': 'Atur warna berdasarkan kondisi nilai tag (min/max/sama dengan). Contoh: OFF hitam, ON hijau.',
    'rotation': 'Putar widget bebas, misalnya 0°, 90°, 180°, 270°.',
    'facing': 'Arah hadap: kanan, kiri (cermin), atas, atau bawah.',
    'blinkOnAlarm': 'Widget berkedip saat tag alarm (fAlarm, HiHi, Hi, Lo, LoLo).',
    'blinkColor': 'Warna kedip untuk alarm berat (HiHi/LoLo).',
    'useAck': 'Kedip hanya selama alarm belum di-acknowledge; setelah di-ack warna alarm tetap tapi diam.',
    'useLevelColors': 'Pakai warna berbeda untuk alarm ringan (Hi/Lo).',
    'warnColor': 'Warna untuk alarm Hi/Lo.',
    'showBadQuality': 'Saat kualitas tag buruk, widget jadi abu-abu dan muncul tanda seru merah.',
    'showTagName': 'Tampilkan nama tag di bawah widget.',
    'showValue': 'Tampilkan nilai tag (dengan satuan) di bawah widget.',
    'showAutoManual': 'Tampilkan badge A (Auto) / M (Manual).',
    'useTagRange': 'Pakai Out min / Out max dari konfigurasi tag sebagai 0% dan 100% level.',
    'levelMin': 'Nilai saat tangki kosong (dipakai jika range tag dimatikan).',
    'levelMax': 'Nilai saat tangki penuh (dipakai jika range tag dimatikan).',
    'fillDirection': 'Arah pengisian: bawah→atas, atas→bawah, kiri→kanan, kanan→kiri. Selalu mengikuti layar walau widget diputar.',
    'emptyColor': 'Warna bagian tangki yang kosong.',
    'waterAnimation': 'Animasi air: ombak di permukaan dan gelembung naik.',
    'showScale': 'Tampilkan penggaris level dari min ke max di samping tangki.',
    'scaleDivisions': 'Jumlah pembagian skala (1-10).',
    'scalePrecision': 'Jumlah angka di belakang koma pada skala.',
    'showLimitLines': 'Tampilkan garis HiHi/Hi/Lo/LoLo dari konfigurasi alarm tag.',
    'limitLineColor': 'Warna garis batas saat normal.',
    'limitLineAlarm': 'Garis batas yang terlewati berubah warna alarm dan berkedip.',
}

def alias(base):
    return ' '.join(x.upper() if x.lower() == '3d' else (x[:1].upper() + x[1:]) for x in re.split(r'[_\s-]+', base) if x)

out = []
for d in sys.argv[1:]:
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.svg'): continue
        svg = open(os.path.join(d, fn), encoding='utf-8').read()
        svg = re.sub(r'\s*<metadata>.*?</metadata>', '', svg, flags=re.S)
        base = fn[:-4]
        slug = re.sub(r'[^a-z0-9]+', '-', base.lower()).strip('-')
        key = base.lower()
        is_tank = bool(re.match(r'tank|group', key))
        if re.match(r'group', key): name = 'Tank ' + base.replace('Group', 'Group').replace('-', ' ')
        else: name = alias(base.replace('(1)', 'B'))
        props = json.loads(re.search(r'<properties>(.*?)</properties>', svg, re.S).group(1))
        tr = json.loads(re.search(r'<translations>(.*?)</translations>', svg, re.S).group(1)).get('id', {})
        cats = [c for c, p in CATS if re.search(p, key)] or ['Production']
        kind = next(((l, e) for p, l, e in KIND if re.search(p, key)), ('Equipment', 'Equipment proses.'))
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
                          'desc': PDOC.get(p['name'], '')})
        template = 'Template 2 - Tank level' if is_tank else 'Template 1 - Indikator'
        desc = kind[1] + (' Bagian dalam tangki menjadi level cairan dengan arah isi, animasi air, skala, dan garis batas alarm yang bisa diatur.' if is_tank
                          else ' Bagian berwarna hitam berubah warna mengikuti tag, berkedip saat alarm, dan bisa diputar atau dibalik arahnya.')
        out.append({'slug': slug, 'name': name, 'kind': kind[0], 'categories': cats, 'template': template,
                    'description': desc + ' Ukuran default 100 x 100 dan siap diimport ke SmartICS.',
                    'properties': plist, 'file_name': base + '.svg', 'svg': svg,
                    'created_at': '2026-10-25' if is_tank else '2026-10-24'})
out.sort(key=lambda w: (w['created_at'], w['name']), reverse=True)
json.dump({w['slug']: w.pop('svg') for w in out}, open('data/widget-svgs.json', 'w'), ensure_ascii=False)
json.dump(out, open('data/widgets.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'widgets', sorted({c for w in out for c in w['categories']}))

# static thumbnails for the cards: drop everything conditional (labels, badges, scale…), tanks half full
import xml.etree.ElementTree as ET
SVGNS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVGNS)
svgs = json.load(open('data/widget-svgs.json'))
os.makedirs('public/previews', exist_ok=True)
for slug, text in svgs.items():
    root = ET.fromstring(text.encode('utf-8'))
    def clean(el):
        for c in list(el):
            if c.get('v-if') is not None or c.tag.endswith('}server') or c.tag.endswith('}metadata'):
                el.remove(c); continue
            clean(c)
        for k in list(el.attrib):
            if k.startswith('{https://vuejs.org') or k.startswith('v-'): del el.attrib[k]
        if el.tag == f'{{{SVGNS}}}rect' and el.get('y') == '-1' and el.get('x') == '-0.5':
            el.set('height', '1.55'); el.set('fill', '#2196F3')
    clean(root)
    open(f'public/previews/{slug}.svg', 'w', encoding='utf-8').write(ET.tostring(root, encoding='unicode'))
print('previews', len(svgs))
