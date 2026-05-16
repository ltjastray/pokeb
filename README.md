# Katalog Menu — Static CRUD untuk GitHub Pages

Project ini sudah dipisah menjadi file statis yang bisa langsung dibaca GitHub Pages:

- `index.html` — struktur halaman
- `styles.css` — styling
- `app.js` — login, render katalog, CRUD, localStorage, export JSON
- `data.json` — data awal
- `.nojekyll` — mencegah proses Jekyll mengubah file statis

## Login demo

- Username: `admin`
- Password: `****`
- const ADMIN_USERNAME = "admin";
- const ADMIN_PASSWORD_SHA256 = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c7xxxx";

Password tidak disimpan sebagai teks polos di `app.js`, tetapi dibandingkan dengan hash SHA-256. Ini hanya obfuscation ringan untuk static site, bukan keamanan backend sungguhan.

## Cara kerja penyimpanan

GitHub Pages adalah hosting statis. JavaScript di browser tidak bisa menulis balik langsung ke file `data.json` di repository.

Alur yang dipakai:

1. Saat pertama dibuka, aplikasi membaca `data.json`.
2. Setelah admin tambah/edit/hapus, data disimpan ke `localStorage` browser.
3. Tombol **Export JSON** mengunduh versi terbaru `data.json`.
4. Jika ingin data permanen untuk semua pengunjung, upload/commit file `data.json` hasil export ke repository GitHub.

## Deploy ke GitHub Pages

1. Upload semua file ini ke root repository.
2. Pastikan file utama bernama `index.html`.
3. Buka repository GitHub → Settings → Pages.
4. Pilih branch `main` dan folder `/root`.
5. Save, lalu buka URL GitHub Pages Anda.

## Batasan penting

- Data CRUD lokal hanya berlaku di browser/perangkat yang melakukan perubahan.
- Untuk CRUD global multi-user, perlu backend/API/database, misalnya Supabase, Firebase, GitHub API + token server-side, atau server kecil sendiri.
- Jangan menaruh token GitHub pribadi di JavaScript publik.
