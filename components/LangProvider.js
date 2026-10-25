'use client';
import { createContext, useContext, useMemo } from 'react';
import { translator } from '@/lib/i18n';

const Ctx = createContext({ lang: 'id', t: translator('id') });
export function LangProvider({ lang, children }) {
  const v = useMemo(() => ({ lang, t: translator(lang) }), [lang]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
