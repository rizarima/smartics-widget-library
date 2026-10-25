import './globals.css';
import Link from 'next/link';
import Header from '@/components/Header';
import { LangProvider } from '@/components/LangProvider';
import { SITE_NAME } from '@/lib/site';
import { getT } from '@/lib/lang';

export function generateMetadata() {
  const { t } = getT();
  return { title: { default: SITE_NAME, template: '%s · ' + SITE_NAME }, description: t('site.desc') };
}

export default function RootLayout({ children }) {
  const { lang, t } = getT();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <LangProvider lang={lang}>
          <Header />
          <main><div className="container">{children}</div></main>
          <footer className="footer">
            <div className="container">
              <span>© {new Date().getFullYear()} {SITE_NAME} · {t('site.tagline')}</span>
              <span><Link href="/widgets">{t('nav.widgets')}</Link> · <Link href="/berita">{t('nav.news')}</Link> · <Link href="/package">{t('nav.packages')}</Link> · <Link href="/update">{t('nav.updates')}</Link></span>
            </div>
          </footer>
        </LangProvider>
      </body>
    </html>
  );
}
