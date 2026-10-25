'use client';
import { useRouter } from 'next/navigation';
import { LANGS, LANG_COOKIE } from '@/lib/i18n';
import { useLang } from './LangProvider';

export default function LangSwitch() {
  const router = useRouter();
  const { lang, t } = useLang();
  const pick = l => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="lang seg" role="group" aria-label={t('nav.language')}>
      {LANGS.map(([k, short, name]) => <button key={k} className={lang === k ? 'on' : ''} title={name} aria-pressed={lang === k} onClick={() => pick(k)}>{short}</button>)}
    </div>
  );
}
