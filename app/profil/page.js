import { redirect } from 'next/navigation';
import Icon from '@/components/Icon';
import ProfileForm from '@/components/ProfileForm';
import { getCurrentUser, hasSupabase } from '@/lib/supabase-server';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';
export function generateMetadata() { return { title: getT().t('prof.title') }; }

export default async function Profile() {
  const { t } = getT();
  if (!hasSupabase) return <div className="auth"><div className="card"><div className="notice err">{t('auth.disabled')}</div></div></div>;
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/profil');
  return (
    <div className="profile">
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1><Icon name="person" /> {t('prof.title')}</h1><p>{t('prof.lead')}</p></div></div>
      <ProfileForm user={{ id: user.id, email: user.email, name: user.name, company: user.company, phone: user.phone, role: user.role, status: user.status, avatar: user.avatar }} />
    </div>
  );
}
