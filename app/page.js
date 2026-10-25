import Link from 'next/link';
import WidgetCard from '@/components/WidgetCard';
import Icon, { CAT_ICON } from '@/components/Icon';
import { getStats, latestWidgets, getContent } from '@/lib/data';
import { CATEGORIES } from '@/lib/site';
import { fmtDateL } from '@/lib/i18n';
import { localizeWidget, localizePost, categoryDesc, templateName } from '@/lib/i18n-data';
import { getT } from '@/lib/lang';
import { excerpt } from '@/lib/text';

export const dynamic = 'force-dynamic';
const TONES = ['tone-teal', 'tone-amber', 'tone-purple', 'tone-pink', 'tone-slate', 'tone-blue'];

function Feed({ type, items, icon, tone, lang }) {
  return (
    <ul className="feed">
      {items.map(x => (
        <li key={x.id}>
          <Link href={`/${type}/${x.id}`}>
            <span className={'tone ' + tone} style={{ width: 40, height: 40, borderRadius: 12 }}><Icon name={icon} size={20} /></span>
            <span><span className="meta">{fmtDateL(lang, x.date)}</span><b>{x.title || x.name}</b><span className="ex">{excerpt(x.body, 110)}</span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Dashboard() {
  const { lang, t } = getT();
  const L = xs => xs.map(x => localizePost(x, lang));
  const [stats, latest, updates, packages, news] = await Promise.all([getStats(), latestWidgets(8), getContent('updates', 4).then(L), getContent('packages', 3).then(L), getContent('news', 4).then(L)]);
  return (
    <>
      <section className="hero">
        <h1>SmartICS Widget Library</h1>
        <p>{t('home.lead', { n: stats.total })}</p>
        <form className="hero-search" action="/widgets">
          <Icon name="search" />
          <input name="q" placeholder={t('home.searchPh')} aria-label={t('search.widget')} />
          <button className="btn btn-filled">{t('search')}</button>
        </form>
        <div className="hero-chips">
          {CATEGORIES.map(c => <Link key={c.id} href={`/widgets?cat=${encodeURIComponent(c.id)}`} title={categoryDesc(lang, c)}><Icon name={CAT_ICON[c.id]} size={16} />{c.label}</Link>)}
        </div>
      </section>

      <div className="stats">
        <Link href="/widgets" className="stat"><span className="tone tone-blue"><Icon name="widgets" size={24} /></span><span><b>{stats.total}</b><span>{t('home.total')}</span></span></Link>
        {CATEGORIES.map((c, i) => (
          <Link key={c.id} href={`/widgets?cat=${encodeURIComponent(c.id)}`} className="stat"><span className={'tone ' + TONES[i % TONES.length]}><Icon name={CAT_ICON[c.id]} size={24} /></span><span><b>{stats.perCat[c.id] || 0}</b><span>{c.label}</span></span></Link>
        ))}
      </div>

      <div className="grid dash">
        <div className="grid">
          <section className="card">
            <div className="section-head"><h2><Icon name="widgets" />{t('home.latestWidgets')}</h2><Link href="/widgets" className="link-more">{t('home.allWidgets')}<Icon name="arrow" size={16} /></Link></div>
            <div className="wgrid">{latest.map(w => <WidgetCard key={w.slug} w={localizeWidget(w, lang)} lang={lang} />)}</div>
          </section>
          <section className="card">
            <div className="section-head"><h2><Icon name="package" />{t('home.latestPackages')}</h2><Link href="/package" className="link-more">{t('home.allPackages')}<Icon name="arrow" size={16} /></Link></div>
            <div className="pkgs">
              {packages.map(p => (
                <Link key={p.id} href={`/package/${p.id}`} className="pkg">
                  <div className="pkg-top"><span className="tone tone-blue" style={{ width: 40, height: 40, borderRadius: 12 }}><Icon name="package" /></span>{p.version && <span className="ver">v{p.version}</span>}</div>
                  <b>{p.name}</b>
                  <span className="muted small">{excerpt(p.description || p.body, 100)}</span>
                  <div className="chips">{p.count ? <span className="chip">{t('nWidgets', { n: p.count })}</span> : null}{p.template && <span className="chip">{templateName(lang, p.template).split(' - ')[0]}</span>}<span className="chip">{fmtDateL(lang, p.date)}</span></div>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <div className="grid">
          <section className="card">
            <div className="section-head"><h2><Icon name="update" />{t('home.latestUpdates')}</h2><Link href="/update" className="link-more">{t('all')}<Icon name="arrow" size={16} /></Link></div>
            <Feed type="update" items={updates} icon="update" tone="tone-teal" lang={lang} />
          </section>
          <section className="card">
            <div className="section-head"><h2><Icon name="news" />{t('home.latestNews')}</h2><Link href="/berita" className="link-more">{t('all')}<Icon name="arrow" size={16} /></Link></div>
            <Feed type="berita" items={news} icon="news" tone="tone-purple" lang={lang} />
          </section>
        </div>
      </div>
    </>
  );
}
