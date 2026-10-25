import Icon from '@/components/Icon';
import AdminNav from '@/components/admin/AdminNav';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }) {
  const { db, reason } = await requireAdmin();
  if (!db) {
    return (
      <div className="auth"><div className="card">
        <div className="auth-icon"><Icon name="admin" size={26} /></div>
        <h1>Halaman admin</h1>
        <p className="muted">{reason === 'nodb' ? 'Database Supabase belum dihubungkan, jadi halaman admin belum bisa dipakai.' : 'Halaman ini khusus admin. Minta admin mengubah peran akun Anda menjadi admin.'}</p>
      </div></div>
    );
  }
  const { count } = await db.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('role', 'partner');
  return (
    <div className="admin">
      <AdminNav pending={count || 0} />
      <div>{children}</div>
    </div>
  );
}
