# 🌲 Project Tree — Aplikasi ROCKET
### PT ASABRI (Persero) | Bidang Komunikasi dan Protokoler

---

## Daftar Isi

1. [Pendekatan Arsitektur](#1-pendekatan-arsitektur)
2. [Struktur Root](#2-struktur-root)
3. [Frontend — React + Vite + TypeScript](#3-frontend--react--vite--typescript)
4. [Backend — NestJS + Prisma](#4-backend--nestjs--prisma)
5. [Shared Packages](#5-shared-packages)
6. [Penjelasan File Kunci](#6-penjelasan-file-kunci)
7. [Environment Variables](#7-environment-variables)
8. [Aturan Import & Alias Path](#8-aturan-import--alias-path)

---

## 1. Pendekatan Arsitektur

Aplikasi ROCKET menggunakan pendekatan **Monorepo** dengan struktur `apps/` untuk menyimpan dua aplikasi utama (frontend dan backend) serta `packages/` untuk kode yang dibagi bersama. Pendekatan ini dipilih karena:

Tim yang sama mengelola frontend dan backend sekaligus, sehingga satu repository mengurangi overhead koordinasi. TypeScript type definitions dapat dibagi antara frontend dan backend tanpa duplikasi — misalnya, tipe `Project` cukup didefinisikan sekali di `packages/shared-types` dan dipakai di kedua sisi. Proses CI/CD juga menjadi lebih sederhana karena seluruh kode berada di satu tempat.

---

## 2. Struktur Root

```
rocket-app/                          ← Root directory seluruh project
│
├── apps/                            ← Aplikasi utama
│   ├── frontend/                    ← React + Vite + TypeScript
│   └── backend/                     ← NestJS + Prisma + PostgreSQL
│
├── packages/                        ← Kode yang dibagi antar apps
│   └── shared-types/                ← TypeScript type definitions bersama
│
├── docs/                            ← Dokumentasi teknis
│   ├── database.md                  ← Arsitektur database (file ini)
│   ├── project_tree.md              ← Struktur project
│   ├── setup_code.md                ← Panduan setup & instalasi
│   └── modul.md                     ← Daftar dan penjelasan modul
│
├── docker-compose.yml               ← Konfigurasi Docker untuk development
├── docker-compose.prod.yml          ← Konfigurasi Docker untuk production
├── .gitignore                       ← File & folder yang diabaikan Git
├── .editorconfig                    ← Konfigurasi editor (indent, newline)
├── turbo.json                       ← Konfigurasi Turborepo (monorepo build)
└── README.md                        ← Panduan singkat untuk developer baru
```

---

## 3. Frontend — React + Vite + TypeScript

```
apps/frontend/
│
├── public/
│   ├── favicon.ico                  ← Ikon tab browser
│   └── logo-asabri.png              ← Logo ASABRI untuk halaman login
│
├── src/
│   │
│   ├── assets/                      ← Aset statis yang diimport oleh kode
│   │   ├── images/
│   │   │   ├── logo-asabri.svg      ← Logo vektor untuk Navbar & Sidebar
│   │   │   └── bg-login.jpg         ← Background halaman login
│   │   └── styles/
│   │       └── global.css           ← CSS global (reset, font-face, dll)
│   │
│   ├── components/                  ← Komponen UI yang dapat digunakan ulang
│   │   │
│   │   ├── common/                  ← Komponen generik, tidak spesifik fitur
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx       ← Komponen tombol dengan variant (primary, danger, dll)
│   │   │   │   └── Button.test.tsx  ← Unit test komponen Button
│   │   │   ├── Badge/
│   │   │   │   └── StatusBadge.tsx  ← Badge status project (warna sesuai status)
│   │   │   ├── Modal/
│   │   │   │   ├── ConfirmModal.tsx ← Modal konfirmasi hapus / aksi destruktif
│   │   │   │   └── FormModal.tsx    ← Modal yang berisi form input
│   │   │   ├── Table/
│   │   │   │   ├── DataTable.tsx    ← Tabel generik berbasis TanStack Table
│   │   │   │   └── TableActions.tsx ← Tombol aksi (View, Edit, Delete) per baris
│   │   │   ├── Loading/
│   │   │   │   ├── PageSpinner.tsx  ← Spinner fullpage saat data loading
│   │   │   │   └── SkeletonRow.tsx  ← Skeleton loading untuk baris tabel
│   │   │   ├── Empty/
│   │   │   │   └── EmptyState.tsx   ← Tampilan saat data kosong
│   │   │   └── Notification/
│   │   │       └── NotifBell.tsx    ← Bell icon + dropdown notifikasi
│   │   │
│   │   ├── charts/                  ← Komponen grafik berbasis Recharts
│   │   │   ├── ProgressBarChart.tsx ← Bar chart jumlah project per status
│   │   │   ├── ProgressPieChart.tsx ← Pie chart persentase status project
│   │   │   ├── StaffBarChart.tsx    ← Bar chart jumlah pekerjaan per staff
│   │   │   └── AnggaranGauge.tsx    ← Gauge/progress bar serapan anggaran
│   │   │
│   │   ├── layout/                  ← Komponen struktur halaman
│   │   │   ├── AppLayout.tsx        ← Layout utama: Sidebar + Navbar + Content
│   │   │   ├── Sidebar.tsx          ← Navigasi samping kiri
│   │   │   ├── Navbar.tsx           ← Header atas (judul halaman, user info, notif)
│   │   │   ├── PageHeader.tsx       ← Judul + breadcrumb setiap halaman
│   │   │   └── AuthLayout.tsx       ← Layout khusus halaman login
│   │   │
│   │   └── forms/                   ← Komponen form yang lebih kompleks
│   │       ├── ProjectForm/
│   │       │   ├── ProjectForm.tsx  ← Form utama create/edit project
│   │       │   └── SubProjectForm.tsx ← Sub-form untuk menambah sub project
│   │       ├── AnggaranForm/
│   │       │   ├── PosForm.tsx      ← Form tambah/edit pos anggaran
│   │       │   └── RealisasiForm.tsx ← Form input realisasi pengeluaran
│   │       └── ReviewForm/
│   │           └── RevisiForm.tsx   ← Form komentar revisi oleh Kabid/Kadiv
│   │
│   ├── pages/                       ← Halaman utama yang dirender oleh router
│   │   │
│   │   ├── Auth/
│   │   │   ├── LoginPage.tsx        ← Halaman login dengan input username/password AD
│   │   │   └── UnauthorizedPage.tsx ← Halaman akses ditolak (role tidak mencukupi)
│   │   │
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.tsx    ← Halaman dashboard utama dengan semua grafik
│   │   │
│   │   ├── WorkingTracker/
│   │   │   ├── WorkingTrackerPage.tsx   ← Halaman list tabel semua project
│   │   │   ├── ProjectFormPage.tsx      ← Halaman create / edit project
│   │   │   └── ProjectDetailPage.tsx    ← Halaman detail project + sub project
│   │   │
│   │   ├── Review/
│   │   │   ├── ReviewListPage.tsx       ← Daftar project yang perlu di-review (Kabid/Kadiv)
│   │   │   └── ReviewDetailPage.tsx     ← Detail project yang sedang di-review
│   │   │
│   │   ├── Anggaran/
│   │   │   ├── AnggaranPage.tsx         ← Halaman utama anggaran dengan tabel pos
│   │   │   ├── PosFormPage.tsx          ← Halaman tambah/edit pos anggaran
│   │   │   └── RealisasiPage.tsx        ← Halaman daftar + tambah realisasi
│   │   │
│   │   ├── LinkPenting/
│   │   │   └── LinkPentingPage.tsx      ← Halaman daftar link penting unit kerja
│   │   │
│   │   └── Settings/
│   │       ├── UserManagementPage.tsx   ← Halaman kelola user (Super User only)
│   │       └── ProfilePage.tsx          ← Halaman profil user sendiri
│   │
│   ├── hooks/                       ← Custom React hooks untuk logika yang sering dipakai
│   │   ├── useAuth.ts               ← Hook untuk mengakses data user login & logout
│   │   ├── useProjects.ts           ← Hook fetch list project dengan filter & pagination
│   │   ├── useProjectDetail.ts      ← Hook fetch satu project beserta sub projectnya
│   │   ├── useReviews.ts            ← Hook fetch daftar review pending
│   │   ├── useAnggaran.ts           ← Hook fetch pos anggaran dan realisasi
│   │   ├── useNotifications.ts      ← Hook fetch & mark-as-read notifikasi
│   │   ├── useDashboard.ts          ← Hook fetch semua data agregasi untuk dashboard
│   │   └── useExport.ts             ← Hook trigger export PDF / Excel / CSV
│   │
│   ├── stores/                      ← State management global menggunakan Zustand
│   │   ├── authStore.ts             ← State: user info, token JWT, status login
│   │   ├── uiStore.ts               ← State: sidebar open/close, loading global, modal
│   │   └── notifStore.ts            ← State: jumlah notifikasi belum dibaca (badge)
│   │
│   ├── services/                    ← Semua pemanggilan API ke backend
│   │   ├── api.ts                   ← Axios instance + interceptor (attach token, handle 401)
│   │   ├── authService.ts           ← Login, logout, refresh token
│   │   ├── projectService.ts        ← CRUD project & sub project
│   │   ├── reviewService.ts         ← Submit review, approve, revisi
│   │   ├── anggaranService.ts       ← CRUD pos anggaran & realisasi
│   │   ├── linkService.ts           ← CRUD link penting
│   │   ├── userService.ts           ← Get & update user
│   │   ├── notifService.ts          ← Fetch & read notifikasi
│   │   ├── dashboardService.ts      ← Fetch data agregasi dashboard
│   │   └── exportService.ts         ← Trigger endpoint export PDF/Excel/CSV
│   │
│   ├── types/                       ← TypeScript type definitions khusus frontend
│   │   ├── api.types.ts             ← Tipe generic ApiResponse<T>, PaginatedResponse<T>
│   │   ├── filter.types.ts          ← Tipe parameter filter & sort
│   │   └── chart.types.ts           ← Tipe data input untuk komponen chart
│   │
│   ├── utils/                       ← Fungsi-fungsi pembantu
│   │   ├── dateHelper.ts            ← Format tanggal Indonesia, kalkulasi H-3, dll
│   │   ├── currencyHelper.ts        ← Format angka ke rupiah (Rp 1.500.000)
│   │   ├── roleHelper.ts            ← Cek role: isKabid(), isStaff(), canEdit(), dll
│   │   ├── statusHelper.ts          ← Mapping status ke warna badge & label Indonesia
│   │   ├── exportHelper.ts          ← Trigger download file dari blob response
│   │   └── constants.ts             ← Konstanta: STATUS_OPTIONS, MONTH_OPTIONS, dll
│   │
│   ├── router/
│   │   └── index.tsx                ← React Router v6 config + Route Guard by role
│   │
│   ├── App.tsx                      ← Root component: QueryClientProvider + RouterProvider
│   └── main.tsx                     ← Entry point: render App ke DOM
│
├── index.html                       ← HTML template untuk Vite
├── vite.config.ts                   ← Konfigurasi Vite (alias, proxy ke backend)
├── tsconfig.json                    ← Konfigurasi TypeScript frontend
├── tailwind.config.ts               ← Konfigurasi Tailwind CSS (custom color ASABRI)
├── postcss.config.js                ← Konfigurasi PostCSS
├── .env                             ← Environment variables development
├── .env.production                  ← Environment variables production
└── package.json                     ← Dependensi frontend
```

---

## 4. Backend — NestJS + Prisma

```
apps/backend/
│
├── src/
│   │
│   ├── modules/                     ← Setiap fitur bisnis punya modulnya sendiri
│   │   │
│   │   ├── auth/                    ← Autentikasi via LDAP Active Directory
│   │   │   ├── auth.module.ts       ← Deklarasi providers & imports modul auth
│   │   │   ├── auth.controller.ts   ← Route: POST /auth/login, POST /auth/logout
│   │   │   ├── auth.service.ts      ← Logika: verifikasi LDAP, buat JWT, sync user
│   │   │   ├── ldap.service.ts      ← Koneksi dan query ke Active Directory server
│   │   │   ├── jwt.strategy.ts      ← Passport strategy untuk validasi JWT
│   │   │   ├── jwt-auth.guard.ts    ← Guard: wajib login untuk mengakses route
│   │   │   └── dto/
│   │   │       └── login.dto.ts     ← DTO: { username: string; password: string }
│   │   │
│   │   ├── users/                   ← Manajemen data user
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts  ← Route: GET /users, PATCH /users/:id
│   │   │   ├── users.service.ts     ← Logika CRUD user, sync dari AD
│   │   │   └── dto/
│   │   │       └── update-user.dto.ts ← DTO: { full_name?, role?, is_active? }
│   │   │
│   │   ├── projects/                ← Modul Working Tracker (project utama)
│   │   │   ├── projects.module.ts
│   │   │   ├── projects.controller.ts  ← Route: GET/POST /projects, GET/PATCH/DELETE /projects/:id
│   │   │   ├── projects.service.ts     ← Logika CRUD project + filter + soft delete
│   │   │   └── dto/
│   │   │       ├── create-project.dto.ts ← Validasi input project baru
│   │   │       ├── update-project.dto.ts ← Partial dari create DTO
│   │   │       └── filter-project.dto.ts ← DTO query param: status, month, year, pic
│   │   │
│   │   ├── sub-projects/            ← Sub project yang berelasi ke project induk
│   │   │   ├── sub-projects.module.ts
│   │   │   ├── sub-projects.controller.ts ← Route nested di bawah /projects/:id/sub-projects
│   │   │   ├── sub-projects.service.ts
│   │   │   └── dto/
│   │   │       ├── create-sub-project.dto.ts
│   │   │       └── update-sub-project.dto.ts
│   │   │
│   │   ├── review/                  ← Proses review & approval berjenjang
│   │   │   ├── review.module.ts
│   │   │   ├── review.controller.ts ← Route: GET /review, POST /review/submit/:projectId
│   │   │   │                        ←        POST /review/approve/:id, POST /review/revise/:id
│   │   │   ├── review.service.ts    ← Logika alur review: validasi stage, update status project
│   │   │   └── dto/
│   │   │       ├── submit-review.dto.ts  ← DTO saat staff mengajukan review
│   │   │       └── revise-review.dto.ts  ← DTO komentar revisi dari Kabid/Kadiv
│   │   │
│   │   ├── anggaran/                ← Manajemen pos anggaran RKAP
│   │   │   ├── anggaran.module.ts
│   │   │   ├── anggaran.controller.ts  ← Route: GET/POST /anggaran, GET /anggaran/serapan
│   │   │   ├── anggaran.service.ts     ← Logika CRUD pos anggaran, kalkulasi serapan
│   │   │   └── dto/
│   │   │       ├── create-anggaran-pos.dto.ts
│   │   │       └── update-anggaran-pos.dto.ts
│   │   │
│   │   ├── realisasi/               ← Input realisasi pengeluaran anggaran
│   │   │   ├── realisasi.module.ts
│   │   │   ├── realisasi.controller.ts ← Route: POST /realisasi, PATCH/DELETE /realisasi/:id
│   │   │   ├── realisasi.service.ts
│   │   │   └── dto/
│   │   │       ├── create-realisasi.dto.ts
│   │   │       └── update-realisasi.dto.ts
│   │   │
│   │   ├── link-penting/            ← Manajemen link penting unit kerja
│   │   │   ├── link-penting.module.ts
│   │   │   ├── link-penting.controller.ts ← Route: GET/POST /links, PATCH/DELETE /links/:id
│   │   │   ├── link-penting.service.ts
│   │   │   └── dto/
│   │   │       ├── create-link.dto.ts
│   │   │       └── update-link.dto.ts
│   │   │
│   │   ├── dashboard/               ← Agregasi data untuk tampilan dashboard
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts ← Route: GET /dashboard (semua data sekaligus)
│   │   │   └── dashboard.service.ts    ← Query agregasi: count by status, per staff, dll
│   │   │
│   │   ├── notifications/           ← Sistem notifikasi in-app + email
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts ← Route: GET /notifications, PATCH /notifications/read-all
│   │   │   ├── notifications.service.ts    ← Buat notifikasi, kirim email via Nodemailer
│   │   │   └── templates/
│   │   │       ├── due-date-reminder.hbs   ← Template email peringatan H-3 (Handlebars)
│   │   │       ├── review-requested.hbs    ← Template email pengajuan review
│   │   │       └── review-approved.hbs     ← Template email persetujuan
│   │   │
│   │   ├── export/                  ← Generator file PDF, Excel, CSV
│   │   │   ├── export.module.ts
│   │   │   ├── export.controller.ts ← Route: GET /export/projects/pdf, /excel, /csv
│   │   │   │                        ←        GET /export/dashboard/pdf, /png
│   │   │   └── export.service.ts    ← Render PDF via Puppeteer, Excel via ExcelJS
│   │   │
│   │   └── scheduler/               ← Cron job otomatis
│   │       ├── scheduler.module.ts
│   │       └── scheduler.service.ts ← Cron H-3 reminder (setiap hari jam 07.00)
│   │
│   ├── common/                      ← Kode shared di seluruh backend
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts    ← Guard: cek JWT valid
│   │   │   └── roles.guard.ts       ← Guard: cek role user cukup untuk akses route ini
│   │   │
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts   ← @Roles(UserRole.LEVEL_2) — menandai route perlu role tertentu
│   │   │   └── current-user.decorator.ts ← @CurrentUser() — inject data user dari JWT ke handler
│   │   │
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts  ← Wrap semua response menjadi { success, data, message }
│   │   │   └── logging.interceptor.ts    ← Log setiap request: method, url, durasi, status
│   │   │
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  ← Tangkap semua exception, format jadi response JSON konsisten
│   │   │
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts        ← Validasi DTO secara otomatis menggunakan class-validator
│   │   │
│   │   └── utils/
│   │       ├── pagination.util.ts   ← Helper kalkulasi skip & take untuk pagination
│   │       └── date.util.ts         ← Helper cek apakah project dalam H-3
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts         ← Registrasi PrismaService sebagai global module
│   │   └── prisma.service.ts        ← Extend PrismaClient, lifecycle hooks onModuleInit
│   │
│   └── main.ts                      ← Entry point: bootstrap NestJS app, CORS, Swagger
│
├── prisma/
│   ├── schema.prisma                ← Definisi lengkap database (lihat database.md)
│   ├── seed.ts                      ← Script seeding data awal
│   └── migrations/                  ← Folder migrasi yang di-generate Prisma
│       └── [timestamp]_init/
│           └── migration.sql
│
├── test/                            ← Integration tests (end-to-end)
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── .env                             ← Environment variables development
├── .env.production                  ← Environment variables production
├── nest-cli.json                    ← Konfigurasi NestJS CLI
├── tsconfig.json                    ← Konfigurasi TypeScript backend
└── package.json                     ← Dependensi backend
```

---

## 5. Shared Packages

```
packages/
│
└── shared-types/                    ← TypeScript types yang dipakai FE & BE
    ├── src/
    │   ├── project.types.ts         ← Interface Project, SubProject, ProjectStatus enum
    │   ├── user.types.ts            ← Interface User, UserRole enum
    │   ├── anggaran.types.ts        ← Interface AnggaranPos, RealisasiAnggaran
    │   ├── review.types.ts          ← Interface ProjectReview, ReviewStatus enum
    │   ├── notification.types.ts    ← Interface Notification, NotificationType enum
    │   └── index.ts                 ← Re-export semua types
    ├── tsconfig.json
    └── package.json
```

Dengan adanya shared-types, ketika backend mengubah interface `Project` misalnya menambah kolom baru, frontend akan langsung mendapat error TypeScript jika belum menyesuaikan kode — mencegah bug yang sulit ditemukan saat runtime.

---

## 6. Penjelasan File Kunci

File-file berikut adalah yang paling penting untuk dipahami karena hampir semua fitur bergantung padanya.

**`apps/backend/src/main.ts`** adalah titik awal seluruh server. Di sini NestJS di-bootstrap, CORS dikonfigurasi agar frontend bisa memanggil API, Swagger UI diaktifkan untuk dokumentasi API otomatis, dan global validation pipe dipasang.

**`apps/backend/src/modules/auth/ldap.service.ts`** adalah jembatan antara aplikasi ROCKET dengan Active Directory ASABRI. Service ini menggunakan library `ldapjs` untuk melakukan `bind` (verifikasi username + password) dan `search` (mengambil data profil karyawan seperti email dan nama lengkap).

**`apps/backend/src/modules/scheduler/scheduler.service.ts`** berisi cron job yang berjalan otomatis setiap hari. Cron H-3 reminder mencari semua project yang due date-nya tinggal 3 hari lagi dan statusnya bukan FINISHED atau CANCELLED, kemudian membuat notifikasi dan mengirim email ke PIC masing-masing.

**`apps/frontend/src/router/index.tsx`** mendefinisikan seluruh routing aplikasi dan Route Guard. Route Guard memastikan pengguna yang belum login diarahkan ke halaman login, dan pengguna dengan role tidak cukup diarahkan ke halaman Unauthorized — misalnya staff yang mencoba mengakses halaman Review Kabid.

**`apps/frontend/src/services/api.ts`** adalah Axios instance yang dikonfigurasi dengan `baseURL` backend. Yang paling penting adalah interceptor-nya: setiap request otomatis dilampiri JWT token dari localStorage, dan setiap response 401 (token expired) otomatis melakukan logout.

---

## 7. Environment Variables

**`apps/frontend/.env`**
```env
# URL backend API
VITE_API_BASE_URL=http://localhost:3001/api

# Nama aplikasi (ditampilkan di tab browser & header)
VITE_APP_NAME=ROCKET — PT ASABRI
```

**`apps/backend/.env`**
```env
# Koneksi PostgreSQL
DATABASE_URL="postgresql://rocket_user:rocket_pass@localhost:5432/rocket_db?schema=public"

# JWT Secret — ganti dengan string random panjang di production
JWT_SECRET="rocket-super-secret-key-ganti-ini-production"
JWT_EXPIRES_IN="8h"

# Konfigurasi LDAP Active Directory
LDAP_URL="ldap://ad.yourcompany.co.id"
LDAP_BASE_DN="DC=yourcompany,DC=co,DC=id"
LDAP_BIND_DN="CN=svc-rocket,OU=ServiceAccounts,DC=yourcompany,DC=co,DC=id"
LDAP_BIND_PASSWORD="your-ldap-service-account-password"

# Konfigurasi SMTP untuk kirim email notifikasi
SMTP_HOST="mail.yourcompany.co.id"
SMTP_PORT=587
SMTP_USER="noreply@yourcompany.co.id"
SMTP_PASS="your-email-password"
SMTP_FROM="ROCKET APP <noreply@yourcompany.co.id>"

# Redis untuk cache
REDIS_HOST="localhost"
REDIS_PORT=6379

# Port server backend
PORT=3001

# Folder untuk menyimpan file yang diupload
UPLOAD_DEST="./uploads"
```

---

## 8. Aturan Import & Alias Path

Untuk menghindari import yang panjang seperti `../../../components/common/Button`, kita mengkonfigurasi alias path di Vite dan TypeScript.

Di **`vite.config.ts`**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@'         : path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages'    : path.resolve(__dirname, './src/pages'),
      '@hooks'    : path.resolve(__dirname, './src/hooks'),
      '@stores'   : path.resolve(__dirname, './src/stores'),
      '@services' : path.resolve(__dirname, './src/services'),
      '@types'    : path.resolve(__dirname, './src/types'),
      '@utils'    : path.resolve(__dirname, './src/utils'),
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'  // Proxy ke backend saat development
    }
  }
})
```

Dengan alias ini, import menjadi bersih dan tidak tergantung pada posisi file:
```typescript
// Sebelum (relative path — rentan rusak saat file dipindah)
import { Button } from '../../../components/common/Button/Button'

// Sesudah (alias path — selalu konsisten)
import { Button } from '@components/common/Button/Button'
```
