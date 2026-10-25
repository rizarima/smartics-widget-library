import Link from 'next/link';
export default function NotFound() {
  return <div className="card"><h1>Halaman tidak ditemukan</h1><p><Link href="/widgets">Kembali ke daftar widget</Link></p></div>;
}
