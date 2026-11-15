// how audit actions read in Admin > Audit trail
export const ACTION_LABEL = {
  'partner.approve': 'Menyetujui partner', 'partner.reject': 'Menolak partner', 'partner.revoke': 'Mencabut akses partner',
  'user.create': 'Menambah user', 'user.role': 'Mengubah peran', 'user.password': 'Mengganti password user', 'user.delete': 'Menghapus user',
  'content.create': 'Membuat', 'content.update': 'Mengubah', 'content.delete': 'Menghapus', 'content.import': 'Menyalin contoh',
  'widget.upload': 'Upload widget baru', 'widget.replace': 'Mengganti file widget', 'widget.update': 'Mengubah widget', 'widget.properties': 'Mengubah properties widget',
  'widget.hide': 'Menyembunyikan widget', 'widget.show': 'Menampilkan widget', 'widget.delete': 'Menghapus widget', 'widget.reset': 'Mengembalikan widget ke bawaan',
  'profile.update': 'Mengubah profil', 'profile.avatar': 'Mengganti foto profil', 'profile.avatar_remove': 'Menghapus foto profil', 'profile.password': 'Mengganti password', 'profile.email': 'Mengganti email',
};
export const ENTITY_LABEL = { user: 'User', news: 'Berita', packages: 'Package', updates: 'Update', widget: 'Widget', profile: 'Profil' };
