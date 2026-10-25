# SmartICS Widget Library

Website katalog widget SCADA SmartICS: dashboard, daftar widget (50 per halaman, filter kategori, pencarian), detail widget dengan simulasi langsung, tombol Request ke WhatsApp, serta login member / daftar partner untuk download.

Dibuat dengan Next.js 14 (App Router) dan Supabase (database + login). Tanpa Supabase pun website tetap jalan memakai data bawaan di folder `data/`, hanya login dan download yang nonaktif.

## Jalankan di komputer

```bash
npm install
cp .env.example .env.local   # isi kunci Supabase (opsional)
npm run dev                  # buka http://localhost:3000
```

## Deploy ke Vercel (bisa diakses siapa saja)

1. **Supabase**: buat project gratis di supabase.com.
   - SQL Editor → tempel isi `supabase/schema.sql` → Run.
   - Authentication → Sign In / Providers → Email: matikan **Confirm email** supaya partner langsung bisa download setelah daftar (kalau dibiarkan aktif, partner harus klik link di email dulu).
   - Authentication → URL Configuration → Site URL: isi alamat Vercel nanti (mis. `https://smartics-widget-library.vercel.app`).
2. **Isi database** (opsional): widget otomatis diambil dari data bawaan di repo selama tabel `widgets` masih kosong, jadi langkah ini boleh dilewati. Kalau ingin mengelola widget dari Supabase, jalankan `npm run seed` (perlu Node.js 20+ dan `.env.local`).
3. **GitHub**: push folder ini ke repository GitHub.
4. **Vercel**: Add New → Project → pilih repository → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Deploy.

## Akun

- **Partner**: daftar sendiri di `/daftar-partner`, langsung bisa download.
- **Member SmartICS**: buat di Supabase → Authentication → Users → Add user, lalu di tabel `profiles` ubah `role` menjadi `member` (atau `admin`).
- Data pendaftar ada di tabel `profiles`, request WhatsApp di `widget_requests`, dan riwayat download di `downloads`.

## Mengubah isi

- **Update, package, berita**: tambah baris di tabel `updates`, `packages`, `news` lewat Supabase Table Editor. Dashboard langsung ikut berubah.
- **Widget baru**: taruh SVG hasil konversi di satu folder, lalu
  ```bash
  python3 scripts/build-data.py <folder-svg> [<folder-lain>]
  npm run seed
  ```
  Script ini membuat `data/widgets.json`, `data/widget-svgs.json`, dan gambar thumbnail di `public/previews/`. Kategori (WTP, Power, Production, Piping, Instrumentation) ditentukan dari nama file di `scripts/build-data.py` dan bisa diubah per widget di kolom `categories` tabel `widgets`.
- **Nomor WhatsApp**: `lib/site.js` (`WHATSAPP`).

## Catatan keamanan

Download dicek di server (harus login). Simulasi di halaman detail tetap memuat SVG widget di browser, jadi orang yang paham teknis masih bisa menyalinnya dari situ.
