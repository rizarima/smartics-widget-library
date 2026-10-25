export const TYPES = {
  berita: { table: 'news', label: 'Berita', title: 'Berita terbaru', icon: 'news', desc: 'Kabar terbaru seputar SmartICS dan widget library.' },
  package: { table: 'packages', label: 'Package', title: 'Package widget', icon: 'package', desc: 'Kumpulan widget yang dirilis bersama dalam satu paket.' },
  update: { table: 'updates', label: 'Update', title: 'Update terbaru', icon: 'update', desc: 'Catatan perubahan dan fitur baru pada widget.' },
};
export const itemTitle = x => x.title || x.name;
