import Link from 'next/link';
import Icon from '@/components/Icon';
import { getCurrentUser, canDownload } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Menunggu persetujuan' };

export default async function Pending() {
  const user = await getCurrentUser();
  const ok = canDownload(user);
  return (
    <div className="auth"><div className="card" style={{ textAlign: 'center' }}>
      <div className="auth-icon" style={{ margin: '0 auto 12px' }}><Icon name={ok ? 'check' : 'hourglass'} size={26} /></div>
      <h1>{ok ? 'Akun Anda sudah aktif' : 'Pendaftaran diterima'}</h1>
      <p className="muted">{ok ? 'Anda sudah bisa mengunduh semua widget.' : `Terima kasih${user ? ', ' + user.name : ''}. Admin SmartICS sedang meninjau akun partner Anda. Notifikasi akan dikirim ke WhatsApp ${user?.phone || 'Anda'} setelah disetujui.`}</p>
      <Link href="/widgets" className="btn btn-filled">Lihat widget</Link>
    </div></div>
  );
}
