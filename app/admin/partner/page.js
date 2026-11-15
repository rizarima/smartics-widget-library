import { requireAdmin } from '@/lib/admin';
import PartnerTable from '@/components/admin/PartnerTable';
import { hasServiceKey } from '@/lib/supabase-admin';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';

const ORDER = { superadmin: 0, admin: 1, member: 2, partner: 3 };

export default async function Partners() {
  const { db, user } = await requireAdmin('/admin/partner');
  const { t } = getT();
  const { data } = await db.from('profiles').select('id, email, full_name, company, phone, role, status, avatar_url, created_at, approved_at').order('created_at', { ascending: false });
  // pending partners first, then by role
  const rows = (data || []).sort((a, b) => ((b.status === 'pending' && b.role === 'partner') - (a.status === 'pending' && a.role === 'partner')) || (ORDER[a.role] ?? 9) - (ORDER[b.role] ?? 9));
  return (
    <>
      <div className="page-head"><div><h1>{t('adm.partner.title')}</h1><p>
        {t('adm.partner.rolesLead', { sa: 'Superadmin', a: 'Admin', m: 'Member', p: 'Partner' })}
        {user.role !== 'superadmin' && t('adm.partner.onlySuperadmin')}
      </p></div></div>
      <PartnerTable rows={rows} gateway={!!process.env.FONNTE_TOKEN} canManage={hasServiceKey} me={{ id: user.id, role: user.role }} />
    </>
  );
}
