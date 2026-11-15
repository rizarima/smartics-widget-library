import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { allWidgets } from '@/lib/data';
import { TYPES } from '@/lib/content-types';
import ContentAdmin from '@/components/admin/ContentAdmin';

export const dynamic = 'force-dynamic';

export default async function ContentPage({ params, searchParams }) {
  const conf = TYPES[params.type];
  if (!conf) notFound();
  const { db } = await requireAdmin(`/admin/konten/${params.type}`);
  const { data } = await db.from(conf.table).select('*').order('date', { ascending: false }).order('id', { ascending: false });
  const widgets = params.type === 'package' ? (await allWidgets()).map(w => ({ slug: w.slug, name: w.name, categories: w.categories, template: w.template })) : [];
  return <ContentAdmin type={params.type} items={data || []} widgets={widgets} openNew={!!searchParams.new} />;
}
