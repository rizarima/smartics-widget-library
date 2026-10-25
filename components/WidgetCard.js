import Link from 'next/link';
import { translator } from '@/lib/i18n';
import { templateName } from '@/lib/i18n-data';

const isNew = d => Date.now() - new Date(d).getTime() < 14 * 864e5;

// w is already localized (kind); lang is for the badge and template chip
export default function WidgetCard({ w, lang = 'id' }) {
  return (
    <Link href={`/widgets/${w.slug}`} className="wcard">
      {isNew(w.created_at) && <span className="badge-new">{translator(lang)('new')}</span>}
      <div className="wthumb"><img src={w.thumb} alt={w.name} loading="lazy" /></div>
      <div className="wbody">
        <b>{w.name}</b>
        <span className="muted small">{w.kind}</span>
        <div className="chips">
          {w.categories.slice(0, 2).map(c => <span key={c} className="chip">{c}</span>)}
          <span className={'chip t' + ((w.template || '').match(/Template (\d)/)?.[1] || '1')}>{templateName(lang, w.template || '').split(' - ')[0]}</span>
        </div>
      </div>
    </Link>
  );
}
