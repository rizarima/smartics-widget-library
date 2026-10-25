import './globals.css';
import Link from 'next/link';
import Header from '@/components/Header';
import { SITE_NAME } from '@/lib/site';

export const metadata = { title: { default: SITE_NAME, template: '%s · ' + SITE_NAME }, description: 'Library widget SCADA SmartICS: lihat, simulasikan, dan unduh widget.' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        <main><div className="container">{children}</div></main>
        <footer className="footer">
          <div className="container">
            <span>© {new Date().getFullYear()} {SITE_NAME} · Widget untuk SCADA SmartICS</span>
            <span><Link href="/widgets">Widget</Link> · <Link href="/berita">Berita</Link> · <Link href="/package">Package</Link> · <Link href="/update">Update</Link></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
