import { requireAdmin } from '@/lib/admin';
import { allWidgets, getContent } from '@/lib/data';
import { listPartnersForBuild, listBuilds } from '@/lib/build-actions';
import { hasWatermarkSecret } from '@/lib/watermark';
import BuildManager from '@/components/admin/BuildManager';

export const dynamic = 'force-dynamic';

export default async function AdminBuild() {
  await requireAdmin('/admin/build');
  const [widgets, packages, { partners }, { builds }] = await Promise.all([
    allWidgets(true).then(list => list.map(w => ({ slug: w.slug, name: w.name, categories: w.categories }))),
    getContent('packages'),
    listPartnersForBuild(),
    listBuilds(),
  ]);
  return (
    <BuildManager
      widgets={widgets}
      packages={(packages || []).map(p => ({ id: p.id, name: p.name, widget_slugs: p.widget_slugs || [] }))}
      partners={partners || []}
      builds={builds || []}
      hasSecret={hasWatermarkSecret}
    />
  );
}
