import 'server-only';
import { cookies, headers } from 'next/headers';
import { LANG_COOKIE, normLang, translator } from './i18n';

// cookie choice first, then the browser language (vi / en), else Indonesian
export function getLang() {
  const c = cookies().get(LANG_COOKIE)?.value;
  if (c) return normLang(c);
  const a = (headers().get('accept-language') || '').toLowerCase();
  const first = a.split(',')[0].trim();
  if (first.startsWith('vi')) return 'vi';
  if (first.startsWith('en')) return 'en';
  return 'id';
}
export const getT = () => { const lang = getLang(); return { lang, t: translator(lang) }; };
