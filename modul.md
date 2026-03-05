# 📦 Daftar Modul — Aplikasi ROCKET
### PT ASABRI (Persero) | Bidang Komunikasi dan Protokoler

---

## Daftar Isi

1. [Gambaran Umum Arsitektur Modul](#1-gambaran-umum-arsitektur-modul)
2. [Modul Backend (NestJS)](#2-modul-backend-nestjs)
   - [2.1 Auth Module](#21-auth-module)
   - [2.2 Users Module](#22-users-module)
   - [2.3 Projects Module](#23-projects-module)
   - [2.4 Sub-Projects Module](#24-sub-projects-module)
   - [2.5 Review Module](#25-review-module)
   - [2.6 Anggaran Module](#26-anggaran-module)
   - [2.7 Realisasi Module](#27-realisasi-module)
   - [2.8 Link-Penting Module](#28-link-penting-module)
   - [2.9 Dashboard Module](#29-dashboard-module)
   - [2.10 Notifications Module](#210-notifications-module)
   - [2.11 Export Module](#211-export-module)
   - [2.12 Scheduler Module](#212-scheduler-module)
   - [2.13 Prisma Module](#213-prisma-module)
3. [Modul Frontend (React)](#3-modul-frontend-react)
   - [3.1 Halaman Auth](#31-halaman-auth)
   - [3.2 Halaman Dashboard](#32-halaman-dashboard)
   - [3.3 Halaman Working Tracker](#33-halaman-working-tracker)
   - [3.4 Halaman Review](#34-halaman-review)
   - [3.5 Halaman Anggaran](#35-halaman-anggaran)
   - [3.6 Halaman Link Penting](#36-halaman-link-penting)
   - [3.7 Halaman Settings](#37-halaman-settings)
4. [Modul Infrastruktur & Utilitas](#4-modul-infrastruktur--utilitas)
5. [Matriks Akses per Role](#5-matriks-akses-per-role)
6. [Dependensi Antar Modul](#6-dependensi-antar-modul)
7. [API Endpoint Lengkap per Modul](#7-api-endpoint-lengkap-per-modul)

---

## 1. Gambaran Umum Arsitektur Modul

Aplikasi ROCKET terdiri dari **13 modul backend** dan **7 kelompok halaman frontend** yang bekerja secara terkoordinasi. Masing-masing modul backend dirancang mengikuti prinsip **Single Responsibility** — satu modul hanya bertanggung jawab untuk satu domain bisnis. Prinsip ini membuat kode lebih mudah diuji, diperbaiki, dan dikembangkan oleh orang yang berbeda tanpa saling mengganggu.

Alur data secara umum berjalan seperti ini: pengguna berinteraksi dengan halaman di frontend, frontend memanggil API melalui `services/`, backend menerima request dan memvalidasinya melalui Guard dan Pipe, request diteruskan ke Controller yang mendelegasikannya ke Service, Service berkomunikasi dengan database via Prisma, dan hasil akhirnya dikembalikan ke frontend dalam format JSON yang seragam.

```
Frontend (React)
       │
       │ HTTP Request (JWT di header)
       ▼
  NestJS Backend
  ┌─────────────────────────────────┐
  │ Guard (cek JWT + Role)          │
  │ Controller (terima request)     │
  │ DTO Validation (validasi input) │
  │ Service (logika bisnis)         │
  │ Prisma Service (query database) │
  └─────────────────────────────────┘
       │
       ▼
  PostgreSQL Database
```

---

## 2. Modul Backend (NestJS)

### 2.1 Auth Module

**Lokasi:** `apps/backend/src/modules/auth/`

**Tanggung jawab:** Mengelola seluruh proses autentikasi. Modul ini adalah gerbang masuk ke aplikasi — tidak ada yang bisa mengakses fitur lain tanpa melewati modul ini terlebih dahulu.

**Cara kerja secara detail:** Ketika pengguna memasukkan username dan password di halaman login, Auth Module meneruskan kredensial tersebut ke Active Directory ASABRI via protokol LDAP. Jika AD memverifikasi bahwa kombinasi username dan password benar, sistem mengambil profil karyawan (nama lengkap dan email) dari direktori AD, kemudian membuat atau memperbarui record user di database lokal (*just-in-time provisioning*). Setelah itu, sistem menghasilkan JWT (*JSON Web Token*) yang berisi informasi user ID, role, dan waktu kedaluwarsa. Token ini yang akan dikirimkan frontend di setiap request berikutnya.

**Komponen utama:**

`auth.controller.ts` — Menerima request login `POST /api/auth/login` dan logout `POST /api/auth/logout`. Controller ini sengaja dibuat sesederhana mungkin, hanya mendelegasikan ke service.

`auth.service.ts` — Otak dari proses autentikasi. Memanggil `LdapService`, mendapat data user dari AD, melakukan upsert ke database, lalu membuat JWT menggunakan `JwtService`.

`ldap.service.ts` — Bertanggung jawab khusus untuk komunikasi dengan LDAP server. Menggunakan library `ldapjs` untuk melakukan `bind` (verifikasi password) dan `search` (ambil atribut user).

`jwt.strategy.ts` — Strategi Passport yang mengekstrak dan memvalidasi JWT dari header `Authorization: Bearer <token>`. Hasilnya diinject ke setiap request handler yang dilindungi.

`jwt-auth.guard.ts` — Guard yang dipasang di setiap route yang memerlukan autentikasi. Jika JWT tidak valid atau tidak ada, request langsung ditolak dengan status 401.

**DTO yang digunakan:** `LoginDto` berisi `username: string` dan `password: string`, keduanya wajib dan tidak boleh kosong.

**Catatan keamanan:** Password pengguna **tidak pernah disimpan** di database lokal — validasinya sepenuhnya dilakukan oleh Active Directory. Ini berarti pengelolaan password (ganti password, reset password, kebijakan kompleksitas password) tetap mengikuti kebijakan AD ASABRI yang sudah ada.

---

### 2.2 Users Module

**Lokasi:** `apps/backend/src/modules/users/`

**Tanggung jawab:** Mengelola data profil karyawan di database lokal, termasuk penugasan role dan status aktif/nonaktif.

**Cara kerja:** Modul ini tidak menangani login — itu urusan Auth Module. Users Module hanya mengelola data yang sudah ada di database. Operasi utamanya adalah: Super User bisa melihat daftar semua user, mengubah nama tampilan karyawan (karena kadang nama di AD tidak sesuai dengan nama yang diinginkan), mengubah role user, dan menonaktifkan akun user yang sudah tidak aktif.

**Komponen utama:**

`users.controller.ts` — Mengelola route `GET /api/users` (daftar semua user, hanya untuk Super User dan Level 1), `GET /api/users/:id` (detail satu user), `PATCH /api/users/:id` (update profil user, dibatasi oleh role).

`users.service.ts` — Berisi logika `findAll`, `findOne`, dan `update`. Service ini memastikan bahwa hanya field yang diizinkan yang bisa diubah — misalnya, `ad_username` dan `email` tidak bisa diubah karena keduanya berasal dari AD.

**DTO yang digunakan:** `UpdateUserDto` berisi `full_name` (opsional), `role` (opsional, hanya Super User yang bisa mengubah), dan `is_active` (opsional, hanya Super User).

**Kontrol akses:** `GET /api/users` hanya bisa diakses oleh Super User dan Level 1. `PATCH /api/users/:id` hanya bisa dilakukan oleh Super User untuk mengubah role dan status, sementara pengguna biasa bisa mengubah `full_name` miliknya sendiri.

---

### 2.3 Projects Module

**Lokasi:** `apps/backend/src/modules/projects/`

**Tanggung jawab:** Mengelola seluruh siklus hidup project di Working Tracker — dari pembuatan, pembacaan dengan filter, pembaruan, hingga penghapusan (soft delete).

**Ini adalah modul terpenting dan terbesar** karena hampir semua fitur utama aplikasi berputar di sekitar data project.

**Cara kerja secara detail:** Setiap kali Staff membuat project baru, mereka mengisi form dengan data yang sudah divalidasi oleh `CreateProjectDto`. Service kemudian menyimpan data ke tabel `projects` dan secara otomatis mengatur status awal menjadi `TO_DO_NEXT`. Service juga mendeteksi apakah due date project sudah terlalu dekat (H-3 atau kurang) dan menambahkan flag peringatan dalam response.

Untuk membaca daftar project, service mendukung filtering multi-parameter secara simultan — pengguna bisa memfilter berdasarkan PIC, status, bulan, tahun, dan judul sekaligus. Paginasi juga diterapkan agar tabel tidak memuat ribuan baris sekaligus.

Level akses pada `PATCH` dan `DELETE` dibedakan: Level 3 (Staff) hanya bisa mengubah project yang `pic_user_id`-nya adalah dirinya sendiri, sedangkan Level 2 ke atas bisa mengubah project siapapun.

**Komponen utama:**

`projects.controller.ts` — Mengelola route `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PATCH /api/projects/:id`, dan `DELETE /api/projects/:id`.

`projects.service.ts` — Berisi logika CRUD lengkap, logika soft delete (mengisi `deleted_at` bukan menghapus baris), dan logika kontrol akses berdasarkan PIC.

**DTO yang digunakan:**

`CreateProjectDto` memastikan semua field wajib tersedia: `name` (min 3 karakter), `due_date` (harus tanggal valid di masa depan), `status` (harus salah satu dari enum `ProjectStatus`), `month` (1-12), `year` (minimal tahun ini), dan `pic_user_id` (harus UUID valid). Field opsional: `working_folder`, `update_notes`, `client`, `keterangan`, `document_url`.

`FilterProjectDto` sebagai query parameter: `pic_user_id` (opsional), `status` (opsional), `month` (opsional, 1-12), `year` (opsional), `search` (opsional, pencarian teks di kolom `name`), `page` (default 1), `limit` (default 20, max 100).

---

### 2.4 Sub-Projects Module

**Lokasi:** `apps/backend/src/modules/sub-projects/`

**Tanggung jawab:** Mengelola sub project yang berada di bawah project induk. Sub project memiliki PIC dan due date tersendiri, namun tetap terikat pada project induknya.

**Cara kerja:** Route sub project bersifat nested di bawah project, contoh: `GET /api/projects/:projectId/sub-projects`. Ini mencerminkan hubungan hierarki yang jelas — Anda selalu perlu mengetahui project induknya untuk mengakses sub project. Ketika project induk di-soft-delete, semua sub project terkait juga otomatis terhapus (*cascade delete* di level database).

**Komponen utama:**

`sub-projects.controller.ts` — Mengelola route `GET /api/projects/:projectId/sub-projects`, `POST /api/projects/:projectId/sub-projects`, `PATCH /api/projects/:projectId/sub-projects/:id`, dan `DELETE /api/projects/:projectId/sub-projects/:id`.

`sub-projects.service.ts` — Berisi validasi bahwa `project_id` yang diberikan benar-benar ada dan milik user yang berwenang sebelum melakukan operasi apapun.

**DTO yang digunakan:** `CreateSubProjectDto` berisi `name`, `due_date`, `pic_user_id` (wajib), dan `status`, `update_notes`, `keterangan` (opsional).

**Aturan bisnis penting:** Due date sub project tidak mempengaruhi due date project induk yang tampil di tabel utama. Tabel Working Tracker hanya menampilkan `due_date` dari tabel `projects`, bukan dari `sub_projects`. Ini sesuai dengan spesifikasi BRS.

---

### 2.5 Review Module

**Lokasi:** `apps/backend/src/modules/review/`

**Tanggung jawab:** Mengelola seluruh alur review dan approval berjenjang (Staff → Kabid → Kadiv/Sesper).

**Cara kerja secara detail:** Ini adalah modul yang paling kompleks dari sisi logika bisnis karena harus mengelola state machine yang melibatkan tiga level pengguna. Ketika Staff mengajukan review, service memvalidasi bahwa project memang milik Staff tersebut, mengubah status project dari `ON_GOING` ke `NEED_FOLLOW_UP`, membuat record baru di tabel `project_reviews` dengan `review_stage=1`, dan mengirimkan notifikasi ke Kabid terkait.

Ketika Kabid menerima review, ia bisa memilih antara dua tindakan: meneruskan ke Kadiv (membuat record `review_stage=2`, status project tetap `NEED_FOLLOW_UP`, notifikasi ke Kadiv) atau mengembalikan dengan catatan revisi (membuat record `status=REVISION`, mengubah status project ke `REVISI`, notifikasi ke Staff).

Ketika Kadiv menyetujui, service membuat record akhir `status=APPROVED`, mengubah status project ke `FINISHED`, dan mengirim notifikasi persetujuan ke Staff dan Kabid.

**Komponen utama:**

`review.controller.ts` — Mengelola route `GET /api/review` (daftar project Need Follow Up untuk reviewer), `POST /api/review/submit/:projectId` (Staff mengajukan), `POST /api/review/approve/:reviewId` (Kabid/Kadiv menyetujui), dan `POST /api/review/revise/:reviewId` (Kabid/Kadiv memberikan revisi).

`review.service.ts` — Berisi seluruh logika state machine review. Service ini paling banyak berinteraksi dengan modul lain: memanggil `NotificationsService` untuk mengirim notifikasi, dan memperbarui data di tabel `projects`.

**DTO yang digunakan:** `SubmitReviewDto` saat ini tidak memerlukan field tambahan (cukup project ID di URL). `ReviseReviewDto` berisi `comment: string` yang wajib diisi — Kabid/Kadiv harus memberikan keterangan revisi yang jelas.

**Kontrol akses:** `POST /api/review/submit` hanya untuk Level 3 (Staff). `POST /api/review/approve` pada stage 1 hanya untuk Level 2 (Kabid), dan pada stage 2 hanya untuk Level 1 (Sesper/Kadiv). Ini divalidasi di level service menggunakan data user dari JWT.

---

### 2.6 Anggaran Module

**Lokasi:** `apps/backend/src/modules/anggaran/`

**Tanggung jawab:** Mengelola pos-pos anggaran sesuai RKAP yang diinput oleh Kepala Bidang di awal tahun anggaran.

**Cara kerja:** Pos anggaran adalah "wadah" yang mewakili satu pos dalam RKAP, misalnya "Biaya Publikasi Media Cetak 2025" dengan total anggaran Rp 500.000.000. Pos ini yang kemudian diisi secara bertahap dengan realisasi-realisasi pengeluaran oleh Staff.

Endpoint `GET /api/anggaran/serapan` adalah endpoint khusus yang menghitung dan mengembalikan persentase serapan per pos secara *real-time* — ini yang ditampilkan di dashboard dan di halaman anggaran.

**Komponen utama:**

`anggaran.controller.ts` — Mengelola route `GET /api/anggaran` (daftar pos), `POST /api/anggaran` (buat pos baru, hanya Level 2 ke atas), `PATCH /api/anggaran/:id` (edit pos, termasuk pergeseran anggaran), `DELETE /api/anggaran/:id`, dan `GET /api/anggaran/serapan?tahun=2025`.

`anggaran.service.ts` — Berisi logika CRUD pos anggaran dan method `getSerapanPerPos` yang menjalankan query agregasi `SUM` dari tabel realisasi.

**DTO yang digunakan:** `CreateAnggaranPosDto` berisi `nama_pos` (wajib), `total_anggaran` (wajib, harus angka positif), `tahun` (wajib), dan `keterangan` (opsional).

---

### 2.7 Realisasi Module

**Lokasi:** `apps/backend/src/modules/realisasi/`

**Tanggung jawab:** Mengelola input realisasi pengeluaran anggaran oleh Staff. Setiap kali ada pengeluaran yang terealisasi, Staff menginput detailnya di sini.

**Cara kerja:** Setiap record realisasi selalu terkait dengan satu pos anggaran (`anggaran_pos_id`). Ketika realisasi baru diinput, database secara otomatis akan memperhitungkan total serapan pos terkait karena kalkulasi dilakukan dengan query agregasi, bukan kolom statis.

**Komponen utama:**

`realisasi.controller.ts` — Mengelola route `GET /api/realisasi?anggaran_pos_id=xxx` (daftar realisasi per pos), `POST /api/realisasi` (input realisasi baru), `PATCH /api/realisasi/:id` (edit, hanya PIC yang mengisi atau Level 2 ke atas), dan `DELETE /api/realisasi/:id`.

`realisasi.service.ts` — Berisi validasi bahwa `anggaran_pos_id` yang diinput valid dan aktif, serta kontrol akses berbasis kepemilikan data.

**DTO yang digunakan:** `CreateRealisasiDto` berisi `anggaran_pos_id` (wajib, UUID), `kegiatan` (wajib), `jumlah` (wajib, harus angka positif), `tanggal_input` (wajib, format date), `nd_realisasi` (opsional), dan `dokumen_url` (opsional).

---

### 2.8 Link-Penting Module

**Lokasi:** `apps/backend/src/modules/link-penting/`

**Tanggung jawab:** Mengelola daftar link penting yang ditampilkan di aplikasi. Data default diambil dari Lampiran I BRS (20 link).

**Cara kerja:** Ini adalah modul yang paling sederhana. Link bisa diubah urutannya (sorting berdasarkan kolom `urutan`), diaktifkan/dinonaktifkan tanpa dihapus, atau diganti dengan URL baru. Hanya Level 2 (Kabid) ke atas yang bisa melakukan perubahan.

**Komponen utama:**

`link-penting.controller.ts` — Mengelola route `GET /api/links` (semua user bisa lihat), `POST /api/links` (Level 2 ke atas), `PATCH /api/links/:id` (Level 2 ke atas), dan `DELETE /api/links/:id` (Level 2 ke atas).

`link-penting.service.ts` — CRUD sederhana, dengan sorting otomatis berdasarkan kolom `urutan`.

**DTO yang digunakan:** `CreateLinkDto` berisi `nama_link` (wajib), `url` (wajib, harus format URL valid), dan `urutan` (wajib, angka integer).

---

### 2.9 Dashboard Module

**Lokasi:** `apps/backend/src/modules/dashboard/`

**Tanggung jawab:** Menyediakan satu endpoint tunggal yang mengembalikan semua data agregasi yang dibutuhkan halaman Dashboard. Memisahkan logika agregasi dari modul lain membuat setiap modul tetap fokus.

**Cara kerja:** Endpoint `GET /api/dashboard` dipanggil sekali saat pengguna membuka halaman Dashboard. Service menjalankan beberapa query paralel menggunakan `Promise.all` untuk efisiensi, mengumpulkan semua hasilnya, dan mengembalikan satu objek JSON yang lengkap. Hasilnya di-cache di Redis selama 5 menit untuk mengurangi beban query database.

**Data yang dikumpulkan oleh `dashboard.service.ts`:**

Data pertama adalah hitungan project per status (untuk bar chart dan pie chart) — ini menggunakan Prisma `groupBy` pada tabel `projects`. Data kedua adalah hitungan project per PIC/staff (untuk grafik per staff) — menggunakan `groupBy pic_user_id`. Data ketiga adalah TOP 5 project dengan due date terdekat yang belum selesai — menggunakan `findMany` dengan `orderBy due_date` dan `take 5`. Data keempat adalah ringkasan serapan anggaran tahun berjalan — memanggil `AnggaranService.getSerapanPerPos`.

**Kontrol akses:** Semua user yang sudah login bisa mengakses dashboard. Namun, untuk pengguna Level 3 (Staff), data yang dikembalikan difilter hanya untuk project milik mereka sendiri — mereka tidak melihat data seluruh tim.

---

### 2.10 Notifications Module

**Lokasi:** `apps/backend/src/modules/notifications/`

**Tanggung jawab:** Mengelola sistem notifikasi dua jalur: notifikasi in-app (tersimpan di database dan muncul di bell icon) dan notifikasi email (dikirim melalui SMTP ke alamat email karyawan).

**Cara kerja:** Notifikasi tidak dibuat dari request pengguna, melainkan dipicu secara internal oleh modul lain. Misalnya, ketika `ReviewService` memproses pengajuan review, ia memanggil `NotificationsService.create()` untuk membuat notifikasi kepada Kabid. Atau ketika `SchedulerService` menemukan project yang due date-nya H-3, ia memanggil `NotificationsService.createDueDateReminder()` untuk semua PIC terkait.

Setiap notifikasi disimpan ke database (tabel `notifications`) DAN dikirim sebagai email menggunakan `@nestjs-modules/mailer` dengan template Handlebars yang sudah disiapkan.

**Komponen utama:**

`notifications.controller.ts` — Mengelola route `GET /api/notifications` (daftar notifikasi milik user yang login), `PATCH /api/notifications/:id/read` (tandai satu notifikasi sudah dibaca), dan `PATCH /api/notifications/read-all` (tandai semua sudah dibaca).

`notifications.service.ts` — Berisi method `create()` yang dipanggil modul lain, method `sendEmail()` yang mengirim email dengan template yang sesuai, dan `findUserNotifications()` untuk mengambil notifikasi per user.

**Template email (Handlebars):**

`due-date-reminder.hbs` — Email peringatan H-3 yang berisi nama project, due date, dan link langsung ke project tersebut di aplikasi.

`review-requested.hbs` — Email ke Kabid bahwa Staff mengajukan review, berisi nama project dan link ke halaman review.

`review-approved.hbs` — Email ke Staff bahwa project telah disetujui oleh Kadiv, berisi konfirmasi bahwa status berubah ke Finished.

---

### 2.11 Export Module

**Lokasi:** `apps/backend/src/modules/export/`

**Tanggung jawab:** Menghasilkan file yang bisa diunduh — PDF, Excel (XLSX), dan CSV — dari data project dan dashboard.

**Cara kerja PDF:** Menggunakan Puppeteer untuk menjalankan Chromium headless (tanpa tampilan). Service merender sebuah HTML template yang berisi data, lalu Puppeteer mengambil screenshot halaman tersebut menjadi file PDF. Hasilnya jauh lebih bagus dibandingkan library PDF murni karena mendukung CSS layout yang kompleks.

**Cara kerja Excel:** Menggunakan ExcelJS untuk membangun workbook secara programatik — menentukan kolom, mengisi baris data, mewarnai header, dan memformat sel angka sebagai currency rupiah.

**Cara kerja CSV:** Ini yang paling sederhana — data dikonversi menjadi string CSV menggunakan JavaScript murni tanpa library tambahan.

**Komponen utama:**

`export.controller.ts` — Mengelola route `GET /api/export/projects/pdf`, `GET /api/export/projects/excel`, `GET /api/export/projects/csv`, dan `GET /api/export/dashboard/pdf`. Semua route ini menerima parameter filter yang sama dengan `GET /api/projects` agar yang diekspor sesuai dengan yang ditampilkan di layar.

`export.service.ts` — Berisi method `generateProjectsPdf()`, `generateProjectsExcel()`, `generateProjectsCsv()`, dan `generateDashboardPdf()`.

**Catatan:** Response dari endpoint export bukan JSON melainkan binary file stream. Controller mengatur response header `Content-Type` dan `Content-Disposition` dengan benar agar browser mendownload file secara otomatis.

---

### 2.12 Scheduler Module

**Lokasi:** `apps/backend/src/modules/scheduler/`

**Tanggung jawab:** Menjalankan tugas otomatis berbasis waktu (cron jobs). Saat ini ada satu cron job utama — pengecekan H-3 due date reminder.

**Cara kerja:** NestJS menggunakan dekorator `@Cron` dari library `@nestjs/schedule` untuk mendefinisikan jadwal. Cron job berjalan di background tanpa perlu dipicu oleh request pengguna.

**Cron Job yang ada:**

`checkDueDateReminder()` berjalan setiap hari pukul **07.00 WIB** (jadwal cron: `'0 7 * * *'`). Method ini menanyakan ke database: "Berikan semua project yang due date-nya antara 3 hari dari sekarang dan 7 hari dari sekarang, yang statusnya bukan FINISHED atau CANCELLED." Untuk setiap project yang ditemukan, service membuat notifikasi in-app dan mengirim email reminder ke PIC terkait. Sistem juga cukup pintar untuk tidak mengirim notifikasi duplikat ke user yang sudah menerima reminder untuk project yang sama hari ini.

**Komponen utama:**

`scheduler.service.ts` — Berisi definisi seluruh cron job menggunakan `@Cron()` dekorator. Memanggil `NotificationsService` untuk pembuatan notifikasi dan pengiriman email.

---

### 2.13 Prisma Module

**Lokasi:** `apps/backend/src/prisma/`

**Tanggung jawab:** Menyediakan `PrismaService` sebagai dependency global yang bisa diinject ke semua modul lain. Ini adalah modul infrastruktur yang tidak terekspos ke luar.

**Cara kerja:** `PrismaModule` didaftarkan sebagai `@Global()` di `AppModule`, sehingga semua modul lain bisa menggunakan `PrismaService` tanpa perlu mengimportnya satu per satu. `PrismaService` meng-extend `PrismaClient` dari Prisma dan menambahkan lifecycle hook `onModuleInit` untuk otomatis terhubung ke database saat aplikasi start.

---

## 3. Modul Frontend (React)

### 3.1 Halaman Auth

**File:** `src/pages/Auth/`

Halaman `LoginPage.tsx` adalah halaman publik satu-satunya — semua halaman lain memerlukan autentikasi. Halaman ini menampilkan form sederhana dengan dua field (username dan password) dan tombol Login. Ketika form disubmit, `authService.login()` dipanggil, JWT yang diterima disimpan ke `localStorage`, dan pengguna diarahkan ke Dashboard.

Halaman `UnauthorizedPage.tsx` ditampilkan ketika pengguna yang sudah login mencoba mengakses halaman yang tidak sesuai dengan rolenya — misalnya Staff yang mencoba membuka halaman User Management.

---

### 3.2 Halaman Dashboard

**File:** `src/pages/Dashboard/DashboardPage.tsx`

Ini adalah halaman pertama yang muncul setelah login. Ia memanggil `useDashboard()` hook yang secara internal memanggil `GET /api/dashboard`. Data yang diterima kemudian didistribusikan ke empat komponen chart:

`ProgressBarChart` menerima data jumlah project per status dan merender bar chart horizontal. `ProgressPieChart` menerima data persentase per status dan merender donut chart yang interaktif. `StaffBarChart` menampilkan jumlah pekerjaan per karyawan sebagai bar chart vertikal. `AnggaranGauge` menampilkan progress bar serapan anggaran total tahun berjalan.

Di bagian bawah terdapat widget **TOP 5 Due Date Terdekat** — sebuah tabel kecil yang menampilkan 5 project paling urgent beserta PIC dan status H-3 warning-nya.

Tombol unduh dashboard tersedia di pojok kanan atas, dengan pilihan format PNG dan PDF.

---

### 3.3 Halaman Working Tracker

**File:** `src/pages/WorkingTracker/`

`WorkingTrackerPage.tsx` adalah halaman list utama yang menampilkan tabel project. Tabel dibangun menggunakan **TanStack Table v8** karena kemampuan sorting dan filtering-nya yang kuat di sisi client. Panel filter tersedia di atas tabel, memungkinkan pengguna memfilter berdasarkan PIC, status, bulan, dan mencari berdasarkan judul project secara simultan.

Setiap baris tabel memiliki ikon peringatan merah (!) jika due date project tinggal H-3 atau kurang. Tombol aksi di setiap baris (View, Edit, Delete) ditampilkan sesuai role — Staff hanya melihat tombol aksi untuk project miliknya sendiri.

`ProjectFormPage.tsx` adalah halaman create dan edit project dalam satu file yang sama. Jika `projectId` tersedia di URL params, form akan pre-filled dengan data project yang ada (mode edit). Jika tidak ada, form kosong (mode create). Bagian sub project di form ini bersifat dinamis — pengguna bisa menambah dan menghapus sub project menggunakan tombol plus dan minus.

`ProjectDetailPage.tsx` menampilkan semua informasi project secara read-only, termasuk daftar lengkap sub project dan histori review (dengan timeline visual yang menunjukkan siapa mereview kapan dan apa hasilnya).

---

### 3.4 Halaman Review

**File:** `src/pages/Review/`

Halaman ini **hanya terlihat** di navigasi untuk pengguna Level 2 (Kabid) ke atas. Untuk Level 3 (Staff), item menu ini tersembunyi.

`ReviewListPage.tsx` menampilkan semua project yang statusnya `NEED_FOLLOW_UP`. Pengguna Level 2 hanya melihat project dari timnya yang di-assign ke Kabid tersebut. Pengguna Level 1 melihat semua project yang sudah melewati tahap review Kabid dan menunggu persetujuan akhir.

`ReviewDetailPage.tsx` menampilkan detail lengkap project yang sedang di-review, termasuk semua update notes dari Staff dan semua sub project. Di halaman ini tersedia dua tombol aksi: "Setujui" yang memicu `reviewService.approve()`, dan "Beri Revisi" yang membuka form kecil untuk mengisi komentar revisi sebelum mengirimkan.

---

### 3.5 Halaman Anggaran

**File:** `src/pages/Anggaran/`

`AnggaranPage.tsx` menampilkan dua hal secara bersamaan: tabel pos anggaran RKAP di bagian atas (dengan kolom nama pos, total anggaran, sudah terserap, dan persentase), dan tabel realisasi di bagian bawah yang menampilkan detail setiap pengeluaran.

`PosFormPage.tsx` adalah form tambah/edit pos anggaran yang hanya bisa diakses Level 2 ke atas. Form ini muncul sebagai modal dialog, bukan halaman terpisah.

`RealisasiPage.tsx` adalah form untuk Staff menginput pengeluaran yang terealisasi. Dropdown `anggaran_pos_id` menampilkan daftar pos yang tersedia untuk tahun ini.

---

### 3.6 Halaman Link Penting

**File:** `src/pages/LinkPenting/LinkPentingPage.tsx`

Halaman sederhana yang menampilkan 20 link penting dalam bentuk kartu atau tabel. Setiap link bisa diklik untuk langsung membuka URL di tab baru. Untuk pengguna Level 2 ke atas, tersedia tombol edit di setiap baris untuk mengubah nama link atau URL-nya.

---

### 3.7 Halaman Settings

**File:** `src/pages/Settings/`

`UserManagementPage.tsx` hanya bisa diakses oleh Super User. Halaman ini menampilkan tabel semua user terdaftar di sistem, dengan kemampuan mengubah role dan status aktif setiap user.

`ProfilePage.tsx` bisa diakses semua user. Menampilkan data profil karyawan yang sedang login (diambil dari JWT) dan memungkinkan mengubah nama tampilan jika diperlukan.

---

## 4. Modul Infrastruktur & Utilitas

Selain modul fitur, ada beberapa modul infrastruktur yang mendukung seluruh aplikasi.

**Guards (`common/guards/`)** adalah "palang pintu" yang diperiksa sebelum setiap request diproses. `JwtAuthGuard` memastikan JWT ada dan valid. `RolesGuard` bekerja bersama dekorator `@Roles()` untuk memastikan user memiliki level akses yang cukup.

**Interceptors (`common/interceptors/`)** memproses request dan response secara transparan. `TransformInterceptor` memformat semua response menjadi struktur yang seragam `{ success: true, data: {...}, message: "..." }`. `LoggingInterceptor` mencatat setiap request yang masuk dengan informasi method, URL, durasi, dan status code — sangat berguna untuk debugging dan monitoring.

**Filters (`common/filters/`)** menangkap exception yang tidak tertangani dan mengubahnya menjadi response HTTP yang bermakna. `HttpExceptionFilter` memastikan bahwa bahkan error tak terduga pun memberikan respons JSON yang terstruktur, bukan HTML error page default Node.js.

**Pipes (`common/pipes/`)** memproses dan memvalidasi data input sebelum sampai ke handler. `ValidationPipe` global yang dikonfigurasi di `main.ts` secara otomatis memvalidasi semua DTO menggunakan aturan dari dekorator `class-validator`.

**Zustand Stores (Frontend)** adalah modul state management global di frontend. `authStore` menyimpan data user yang login dan status autentikasi. `uiStore` menyimpan state UI seperti apakah sidebar sedang terbuka, apakah ada loading global. `notifStore` menyimpan hitungan notifikasi belum dibaca yang ditampilkan sebagai badge merah di bell icon navbar.

---

## 5. Matriks Akses per Role

Tabel berikut merangkum apa yang bisa dilakukan oleh setiap level role di aplikasi. ✅ = Bisa akses penuh, ⚠️ = Akses terbatas (hanya milik sendiri), ❌ = Tidak bisa akses.

| Fitur | Super User | Level 1 (Sesper) | Level 2 (Kabid) | Level 3 (Staff) |
|---|:---:|:---:|:---:|:---:|
| Lihat Dashboard (semua user) | ✅ | ✅ | ✅ | ⚠️ |
| Buat Project | ✅ | ✅ | ✅ | ✅ |
| Edit Project (semua) | ✅ | ✅ | ✅ | ❌ |
| Edit Project (milik sendiri) | ✅ | ✅ | ✅ | ✅ |
| Hapus Project | ✅ | ✅ | ✅ | ❌ |
| Ajukan Review | ❌ | ❌ | ❌ | ✅ |
| Review (Kabid) | ✅ | ✅ | ✅ | ❌ |
| Approve Final (Sesper/Kadiv) | ✅ | ✅ | ❌ | ❌ |
| Tambah Pos Anggaran | ✅ | ✅ | ✅ | ❌ |
| Edit Pos Anggaran | ✅ | ✅ | ✅ | ❌ |
| Input Realisasi Anggaran | ✅ | ✅ | ✅ | ✅ |
| Edit Realisasi (semua) | ✅ | ✅ | ✅ | ❌ |
| Edit Realisasi (milik sendiri) | ✅ | ✅ | ✅ | ✅ |
| Edit Link Penting | ✅ | ✅ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |
| Ubah Role User | ✅ | ❌ | ❌ | ❌ |
| Export PDF/Excel/CSV | ✅ | ✅ | ✅ | ✅ |

---

## 6. Dependensi Antar Modul

Memahami dependensi antar modul penting untuk menghindari *circular dependency* (dua modul yang saling mengimport satu sama lain, yang akan membuat aplikasi gagal start).

```
AppModule
├── PrismaModule (global — tidak perlu diimport, tersedia di semua modul)
├── AuthModule
│   └── UsersModule (untuk sync user dari AD ke database)
│   └── JwtModule
├── UsersModule
├── ProjectsModule
│   └── NotificationsModule (kirim notif jika project diassign ke PIC baru)
├── SubProjectsModule
│   └── ProjectsModule (validasi project induk)
├── ReviewModule
│   └── ProjectsModule (update status project setelah review)
│   └── NotificationsModule (kirim notif ke reviewer berikutnya)
├── AnggaranModule
├── RealisasiModule
│   └── AnggaranModule (validasi pos anggaran)
├── LinkPentingModule
├── DashboardModule
│   └── ProjectsModule (data agregasi project)
│   └── AnggaranModule (data agregasi anggaran)
├── NotificationsModule
│   └── MailerModule
├── ExportModule
│   └── ProjectsModule (data untuk dieksport)
└── SchedulerModule
    └── NotificationsModule (buat notif H-3)
    └── ProjectsModule (query project yang mendekati due date)
```

---

## 7. API Endpoint Lengkap per Modul

Berikut adalah referensi cepat seluruh endpoint yang tersedia. Semua endpoint diawali dengan `/api`. Kecuali `POST /api/auth/login`, semua endpoint memerlukan header `Authorization: Bearer <token>`.

**Auth Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | Publik | Login dengan username & password AD |
| POST | `/auth/logout` | Semua | Invalidasi token (blacklist di Redis) |
| GET | `/auth/me` | Semua | Ambil data user yang sedang login |

**Users Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/users` | Super User, L1 | Daftar semua user |
| GET | `/users/:id` | Super User, L1 | Detail satu user |
| PATCH | `/users/:id` | Super User | Update role, status, atau nama user |

**Projects Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/projects` | Semua | Daftar project (dengan filter & paginasi) |
| POST | `/projects` | Semua | Buat project baru |
| GET | `/projects/:id` | Semua | Detail satu project |
| PATCH | `/projects/:id` | L2+ atau PIC sendiri | Update project |
| DELETE | `/projects/:id` | L2+ | Soft delete project |

**Sub-Projects Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/projects/:id/sub-projects` | Semua | Daftar sub project dari project tertentu |
| POST | `/projects/:id/sub-projects` | L2+ atau PIC sendiri | Tambah sub project |
| PATCH | `/projects/:id/sub-projects/:subId` | L2+ atau PIC sub project | Update sub project |
| DELETE | `/projects/:id/sub-projects/:subId` | L2+ | Hapus sub project |

**Review Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/review` | L1, L2 | Daftar project yang perlu di-review |
| POST | `/review/submit/:projectId` | L3 | Staff mengajukan review |
| POST | `/review/approve/:reviewId` | L1, L2 | Setujui review |
| POST | `/review/revise/:reviewId` | L1, L2 | Kembalikan dengan catatan revisi |
| GET | `/review/history/:projectId` | Semua | Histori review sebuah project |

**Anggaran Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/anggaran` | Semua | Daftar pos anggaran |
| POST | `/anggaran` | L1, L2 | Tambah pos anggaran baru |
| PATCH | `/anggaran/:id` | L1, L2 | Edit pos (termasuk pergeseran) |
| DELETE | `/anggaran/:id` | L1, L2 | Hapus pos anggaran |
| GET | `/anggaran/serapan` | Semua | Kalkulasi serapan per pos |

**Realisasi Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/realisasi` | Semua | Daftar realisasi (bisa filter by pos) |
| POST | `/realisasi` | Semua | Input realisasi baru |
| PATCH | `/realisasi/:id` | L2+ atau PIC sendiri | Edit realisasi |
| DELETE | `/realisasi/:id` | L2+ | Hapus realisasi |

**Link Penting Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/links` | Semua | Daftar link penting (yang is_active = true) |
| POST | `/links` | L1, L2 | Tambah link baru |
| PATCH | `/links/:id` | L1, L2 | Edit link |
| DELETE | `/links/:id` | L1, L2 | Hapus link |

**Dashboard Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/dashboard` | Semua | Semua data agregasi untuk dashboard |

**Notifications Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/notifications` | Semua | Notifikasi milik user yang login |
| PATCH | `/notifications/:id/read` | Semua | Tandai satu notif sudah dibaca |
| PATCH | `/notifications/read-all` | Semua | Tandai semua notif sudah dibaca |

**Export Module**

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/export/projects/pdf` | Semua | Download tabel project sebagai PDF |
| GET | `/export/projects/excel` | Semua | Download tabel project sebagai XLSX |
| GET | `/export/projects/csv` | Semua | Download tabel project sebagai CSV |
| GET | `/export/dashboard/pdf` | Semua | Download dashboard sebagai PDF |
| GET | `/export/dashboard/png` | Semua | Download dashboard sebagai PNG |
