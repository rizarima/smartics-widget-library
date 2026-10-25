import './globals.css';
import Header from '@/components/Header';
import { SITE_NAME } from '@/lib/site';

export const metadata = { title: { default: SITE_NAME, template: '%s · ' + SITE_NAME }, description: 'Library widget SCADA SmartICS: lihat, simulasikan, dan unduh widget.' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <Header />
        <main><div className="container">{children}</div></main>
        <footer className="footer"><div className="container">© {new Date().getFullYear()} {SITE_NAME}. Widget untuk SCADA SmartICS.</div></footer>
      </body>
    </html>
  );
}
