import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWidget, relatedWidgets } from '@/lib/data';
import { getCurrentUser, hasSupabase, canDownload } from '@/lib/supabase-server';
import WidgetCard from '@/components/WidgetCard';
import Simulator from '@/components/Simulator';
import RequestButton from '@/components/RequestButton';
import Icon, { CAT_ICON } from '@/components/Icon';
import { fmtDateL } from '@/lib/i18n';
import { localizeWidget, widgetLabels, templateName } from '@/lib/i18n-data';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const w = await getWidget(params.slug);
  return { title: w ? w.name : 'Widget' };
}

function DownloadArea({ user, slug, t }) {
  if (canDownload(user)) return <a className="btn btn-filled" href={`/api/widgets/${slug}/download`}><Icon name="download" size={18} />{t('w.download')}</a>;
  if (user) return <span className="btn btn-tonal" aria-disabled="true"><Icon name="hourglass" size={18} />{t('w.waiting')}</span>;
  return <Link className="btn btn-filled" href={`/login?next=/widgets/${slug}`}><Icon name="lock" size={18} />{t('w.loginToDownload')}</Link>;
}

export default async function WidgetDetail({ params }) {
  const { lang, t } = getT();
  const w = localizeWidget(await getWidget(params.slug), lang);
  if (!w) notFound();
  const [user, related] = await Promise.all([hasSupabase ? getCurrentUser() : null, relatedWidgets(w)]);
  return (
    <>
      <div className="crumbs"><Link href="/widgets">{t('nav.widgets')}</Link><Icon name="arrow" size={14} /><Link href={`/widgets?cat=${encodeURIComponent(w.categories[0])}`}>{w.categories[0]}</Link><Icon name="arrow" size={14} /><span>{w.name}</span></div>
      <div className="grid detail">
        <section className="card"><Simulator svg={w.svg} name={w.name} labels={widgetLabels(lang)} /></section>
        <section className="grid">
          <div className="card">
            <div className="chips" style={{ marginBottom: 10 }}>
              <span className="chip primary">{w.kind}</span>
              {w.categories.map(c => <Link key={c} href={`/widgets?cat=${encodeURIComponent(c)}`} className="chip"><Icon name={CAT_ICON[c]} size={13} />{c}</Link>)}
              <span className={'chip t' + ((w.template || '').match(/Template (\d)/)?.[1] || '1')}>{templateName(lang, w.template)}</span>
            </div>
            <h1>{w.name}</h1>
            <p style={{ marginTop: 0 }}>{w.description}</p>
            <p className="muted small">{t('w.file')} <code>{w.file_name}</code> · {t('w.added', { d: fmtDateL(lang, w.created_at) })}</p>
            <div className="actions">
              <DownloadArea user={user} slug={w.slug} t={t} />
              <RequestButton slug={w.slug} name={w.name} />
            </div>
            {!user && <div className="notice"><Icon name="person" size={18} /><span>{t('w.downloadNote')} <Link href={`/daftar-partner?next=/widgets/${w.slug}`}>{t('w.registerPartner')}</Link></span></div>}
            {user && !canDownload(user) && <div className="notice warn"><Icon name="hourglass" size={18} /><span>{t('w.reviewing')}</span></div>}
          </div>
          <div className="card">
            <div className="section-head"><h2><Icon name="edit" />{t('w.properties')}</h2></div>
            <p className="muted small" style={{ marginTop: -6 }}>{t('w.propsNote')}</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="props">
                <thead><tr><th>{t('w.colProp')}</th><th>{t('w.colType')}</th><th>{t('w.colDesc')}</th></tr></thead>
                <tbody>
                  {(w.properties || []).map(p => (
                    <tr key={p.name}>
                      <td><b>{p.label}</b><br /><code>{p.name}</code></td>
                      <td className="small">{p.type}{p.default != null && p.default !== '' ? <><br /><span className="muted">default: {String(p.default)}</span></> : null}</td>
                      <td className="small">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      {related.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <div className="section-head"><h2><Icon name={CAT_ICON[w.categories[0]] || 'widgets'} />{t('w.related')}</h2><Link className="link-more" href={`/widgets?cat=${encodeURIComponent(w.categories[0])}`}>{t('w.seeCat', { c: w.categories[0] })}<Icon name="arrow" size={16} /></Link></div>
          <div className="wgrid">{related.map(r => <WidgetCard key={r.slug} w={localizeWidget(r, lang)} lang={lang} />)}</div>
        </section>
      )}
    </>
  );
}
