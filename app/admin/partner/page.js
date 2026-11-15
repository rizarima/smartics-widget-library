import { requireAdmin } from '@/lib/admin';
import PartnerTable from '@/components/admin/PartnerTable';
import { hasServiceKey } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ORDER = { superadmin: 0, admin: 1, member: 2, partner: 3 };

export default async function Partners() {
  const { db, user } = await requireAdmin('/admin/partner');
  const { data } = await db.from('profiles').select('id, email, full_name, company, phone, role, status, avatar_url, created_at, approved_at').order('created_at', { ascending: false });
  // pending partners first, then by role
  const rows = (data || []).sort((a, b) => ((b.status === 'pending' && b.role === 'partner') - (a.status === 'pending' && a.role === 'partner')) || (ORDER[a.role] ?? 9) - (ORDER[b.role] ?? 9));
  return (
    <>
      <div className="page-head"><div><h1>User & peran</h1><p>
        Empat peran: <b>Superadmin</b> (pemilik, bisa semua), <b>Admin</b> (engineer SmartICS: kelola widget, konten, partner, dan member), <b>Member</b> (sales SmartICS: bisa download), dan <b>Partner</b> (daftar sendiri, bisa download setelah disetujui admin atau superadmin).
        {user.role !== 'superadmin' && ' Akun admin dan superadmin hanya bisa diatur oleh superadmin.'}
      </p></div></div>
      <PartnerTable rows={rows} gateway={!!process.env.FONNTE_TOKEN} canManage={hasServiceKey} me={{ id: user.id, role: user.role }} />
    </>
  );
}
