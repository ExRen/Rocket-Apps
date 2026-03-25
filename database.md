# 🗄️ Database Architecture — Aplikasi ROCKET
### PT ASABRI (Persero) | Bidang Komunikasi dan Protokoler

---

## Daftar Isi

1. [Ringkasan Arsitektur](#1-ringkasan-arsitektur)
2. [Database Engine & ORM](#2-database-engine--orm)
3. [Konvensi Penamaan](#3-konvensi-penamaan)
4. [ERD (Entity Relationship Diagram)](#4-erd-entity-relationship-diagram)
5. [Penjelasan Setiap Tabel](#5-penjelasan-setiap-tabel)
6. [Schema Prisma Lengkap](#6-schema-prisma-lengkap)
7. [Indeks & Optimasi Query](#7-indeks--optimasi-query)
8. [State Machine Status Project](#8-state-machine-status-project)
9. [Kalkulasi Anggaran](#9-kalkulasi-anggaran)
10. [Seeding Data Awal](#10-seeding-data-awal)
11. [Backup & Migrasi Strategy](#11-backup--migrasi-strategy)

---

## 1. Ringkasan Arsitektur

Database aplikasi ROCKET dirancang dengan prinsip **normalisasi penuh (3NF)** untuk menghindari redundansi data, namun tetap mempertimbangkan **performa query** untuk kebutuhan dashboard yang menampilkan agregasi data dalam jumlah besar. Seluruh entitas utama menggunakan **UUID** sebagai primary key (bukan auto-increment integer) untuk alasan keamanan — UUID tidak mudah ditebak oleh pengguna yang mencoba mengakses resource orang lain lewat URL.

Database ini memiliki **3 cluster fungsional** yang saling berelasi:

- **Cluster User & Auth** → Mengelola identitas pengguna, role, dan sesi login yang terintegrasi dengan Active Directory.
- **Cluster Working Tracker** → Mengelola seluruh siklus hidup project, sub project, dan proses review/approval berjenjang.
- **Cluster Anggaran** → Mengelola pos anggaran RKAP, realisasi pengeluaran, dan kalkulasi serapan.

Ketiga cluster tersebut diikat oleh tabel `users` sebagai pusat referensi yang digunakan oleh hampir semua tabel lain.

---

## 2. Database Engine & ORM

| Komponen | Pilihan | Alasan |
|---|---|---|
| Database Engine | **PostgreSQL 16** | Open source, stabil, mendukung JSONB, full-text search, dan window functions yang dibutuhkan untuk kalkulasi dashboard |
| ORM | **Prisma 5.x** | Type-safe, auto-generate TypeScript types, migrasi database yang terdokumentasi dengan baik |
| Connection Pooling | **PgBouncer** | Mencegah overload koneksi ke PostgreSQL ketika banyak request bersamaan |
| Cache Layer | **Redis 7** | Digunakan untuk cache data dashboard (grafik tidak perlu di-query ulang setiap detik) dan sesi JWT |

---

## 3. Konvensi Penamaan

Seluruh nama tabel dan kolom menggunakan **snake_case** (huruf kecil dengan underscore). Berikut konvensi lengkapnya:

- **Nama tabel** → plural, snake_case. Contoh: `users`, `projects`, `anggaran_pos`
- **Primary key** → selalu bernama `id`, bertipe UUID, di-generate otomatis
- **Foreign key** → nama tabel referensi (singular) + `_id`. Contoh: `user_id`, `project_id`
- **Timestamp** → setiap tabel wajib memiliki `created_at` dan `updated_at`
- **Soft delete** → menggunakan kolom `deleted_at` (nullable DateTime). Record yang dihapus tidak benar-benar dihapus dari database
- **Boolean** → diawali `is_`. Contoh: `is_active`, `is_read`
- **Enum** → didefinisikan di level Prisma schema dengan nama PascalCase. Contoh: `UserRole`, `ProjectStatus`

---

## 4. ERD (Entity Relationship Diagram)

Berikut adalah representasi relasi antar tabel dalam format teks. Tanda panah menunjukkan arah relasi (many → one).

```
┌─────────────┐
│    users    │◄─────────────────────────────────────────────────┐
│─────────────│                                                   │
│ id (PK)     │◄──────────────────────────┐                      │
│ ad_username │                            │                      │
│ email       │                            │                      │
│ full_name   │                            │                      │
│ role        │                            │                      │
│ is_active   │                            │                      │
└──────┬──────┘                            │                      │
       │ 1                                 │                      │
       │                                   │                      │
       │ has many                          │                      │
       ▼                                   │                      │
┌──────────────┐       ┌────────────────┐  │   ┌────────────────┐ │
│   projects   │1─────►│  sub_projects  │  │   │project_reviews │ │
│──────────────│  many │────────────────│  │   │────────────────│ │
│ id (PK)      │       │ id (PK)        │  │   │ id (PK)        │ │
│ name         │       │ name           │  │   │ project_id(FK) │ │
│ working_folder│      │ project_id(FK) │  │   │ reviewer_id(FK)│─┘
│ update_notes │       │ pic_user_id(FK)│──┘   │ status         │
│ due_date     │       │ due_date       │       │ comment        │
│ status       │       │ status         │       │ review_stage   │
│ month        │       │ update_notes   │       │ reviewed_at    │
│ year         │       │ keterangan     │       └────────────────┘
│ client       │       └────────────────┘
│ keterangan   │
│ document_url │
│ pic_user_id  │──────►│ users.id |
└──────────────┘

┌──────────────┐       ┌──────────────────────┐
│ anggaran_pos │1─────►│  realisasi_anggaran  │
│──────────────│  many │──────────────────────│
│ id (PK)      │       │ id (PK)              │
│ nama_pos     │       │ anggaran_pos_id (FK) │
│ total_anggaran│      │ pic_user_id (FK)     │──►│ users.id │
│ tahun        │       │ kegiatan             │
│ keterangan   │       │ jumlah               │
└──────────────┘       │ nd_realisasi         │
                       │ dokumen_url          │
                       │ tanggal_input        │
                       └──────────────────────┘

┌───────────────┐       ┌────────────────┐
│  link_penting │       │ notifications  │
│───────────────│       │────────────────│
│ id (PK)       │       │ id (PK)        │
│ nama_link     │       │ user_id (FK)   │──►│ users.id │
│ url           │       │ type           │
│ urutan        │       │ title          │
│ is_active     │       │ message        │
└───────────────┘       │ is_read        │
                        │ project_id     │ (opsional, ref ke projects)
                        └────────────────┘
```

---

## 5. Penjelasan Setiap Tabel

### 5.1 Tabel `users`

Tabel ini adalah **pusat dari seluruh sistem**. Data karyawan di-sync dari Active Directory (AD) ASABRI. Saat pertama kali seorang karyawan login menggunakan kredensial AD mereka, sistem akan mengecek apakah `ad_username` mereka sudah ada di tabel ini. Jika belum, record baru akan dibuat secara otomatis (*just-in-time provisioning*).

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key, auto-generated |
| `ad_username` | VARCHAR(100) | No | Username dari Active Directory, harus unik |
| `email` | VARCHAR(255) | No | Email karyawan, harus unik, diambil dari AD |
| `full_name` | VARCHAR(255) | No | Nama lengkap karyawan, bisa diubah Super User |
| `role` | ENUM(UserRole) | No | Role akses: SUPER_USER, LEVEL_1, LEVEL_2, LEVEL_3 |
| `is_active` | BOOLEAN | No | Default true. False jika karyawan sudah tidak aktif |
| `created_at` | TIMESTAMP | No | Waktu record dibuat |
| `updated_at` | TIMESTAMP | No | Waktu record terakhir diubah |

**Catatan penting:** Kolom `password` **tidak disimpan** di database ini karena autentikasi sepenuhnya delegasikan ke Active Directory LDAP. Database hanya menyimpan profil dan role karyawan.

---

### 5.2 Tabel `projects`

Ini adalah tabel inti dari fitur Working Tracker. Setiap baris merepresentasikan satu project yang dikelola oleh tim.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `name` | VARCHAR(500) | No | Nama project / kegiatan |
| `working_folder` | TEXT | Yes | URL ke Google Drive / SharePoint folder kerja |
| `update_notes` | TEXT | Yes | Update progress terkini dari PIC |
| `due_date` | DATE | No | Tenggat waktu project inti (bukan sub project) |
| `status` | ENUM(ProjectStatus) | No | Status project saat ini |
| `month` | SMALLINT | No | Bulan pengerjaan (1-12) |
| `year` | SMALLINT | No | Tahun pengerjaan (misal: 2025) |
| `client` | VARCHAR(255) | Yes | Unit kerja / client yang dilayani |
| `keterangan` | TEXT | Yes | Catatan tambahan |
| `document_url` | TEXT | Yes | URL dokumen pendukung yang di-upload |
| `pic_user_id` | UUID | No | FK ke `users.id` — PIC utama project |
| `created_at` | TIMESTAMP | No | Waktu dibuat |
| `updated_at` | TIMESTAMP | No | Waktu terakhir diubah |
| `deleted_at` | TIMESTAMP | Yes | Soft delete — null berarti aktif |

---

### 5.3 Tabel `sub_projects`

Memungkinkan satu project dipecah menjadi beberapa bagian yang di-assign ke PIC berbeda, masing-masing dengan due date tersendiri. Namun di tabel Working Tracker utama, yang tampil hanya due date project inti.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `project_id` | UUID | No | FK ke `projects.id`, ON DELETE CASCADE |
| `name` | VARCHAR(500) | No | Nama sub project / task |
| `due_date` | DATE | No | Due date sub project ini |
| `status` | ENUM(ProjectStatus) | No | Status sub project |
| `update_notes` | TEXT | Yes | Update dari PIC sub project |
| `keterangan` | TEXT | Yes | Catatan tambahan |
| `pic_user_id` | UUID | No | FK ke `users.id` — PIC sub project |
| `created_at` | TIMESTAMP | No | Waktu dibuat |
| `updated_at` | TIMESTAMP | No | Waktu terakhir diubah |

**Cascade behavior:** Ketika project induk dihapus (soft delete), sub project ikut dihapus secara hard delete karena tidak ada kepentingan bisnis untuk mempertahankan sub project tanpa induknya.

---

### 5.4 Tabel `project_reviews`

Tabel ini menyimpan **seluruh jejak (audit trail) proses review dan approval** secara berjenjang. Setiap aksi review — baik pengajuan, revisi, maupun approval — disimpan sebagai baris baru. Ini membuat histori review sebuah project dapat dilihat kembali kapanpun.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `project_id` | UUID | No | FK ke `projects.id` |
| `reviewer_id` | UUID | No | FK ke `users.id` — siapa yang melakukan aksi ini |
| `status` | ENUM(ReviewStatus) | No | Status pada aksi ini: PENDING, REVIEWED, APPROVED, REVISION |
| `comment` | TEXT | Yes | Komentar revisi dari Kabid atau Kadiv |
| `review_stage` | SMALLINT | No | Tahap review: 1 = Staff→Kabid, 2 = Kabid→Kadiv |
| `reviewed_at` | TIMESTAMP | No | Kapan aksi ini dilakukan |

**Alur data review:**
Ketika Staff mengajukan review → dibuat record baru dengan `status=PENDING`, `review_stage=1`, `reviewer_id` diisi ID Kabid yang dituju.
Ketika Kabid menyetujui → dibuat record baru dengan `status=REVIEWED`, `review_stage=2`.
Ketika Kadiv menyetujui → dibuat record baru dengan `status=APPROVED`. Status di tabel `projects` diubah ke `FINISHED`.
Ketika ada revisi → dibuat record baru dengan `status=REVISION` dan `comment` berisi catatan revisi.

---

### 5.5 Tabel `anggaran_pos`

Menyimpan pos-pos anggaran sesuai RKAP yang diinput oleh Kepala Bidang di awal tahun anggaran.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `nama_pos` | VARCHAR(500) | No | Nama pos anggaran sesuai RKAP (misal: "Biaya Publikasi Media Cetak") |
| `total_anggaran` | DECIMAL(15,2) | No | Pagu / plafon anggaran untuk pos ini |
| `tahun` | SMALLINT | No | Tahun anggaran |
| `keterangan` | TEXT | Yes | Catatan tambahan |
| `created_at` | TIMESTAMP | No | Waktu dibuat |
| `updated_at` | TIMESTAMP | No | Waktu terakhir diubah |

**Pergeseran anggaran:** Jika ada pergeseran anggaran (RKAP berubah), Kepala Bidang cukup mengedit `total_anggaran` pada pos yang bersangkutan. Histori perubahan bisa dilacak lewat `updated_at`.

---

### 5.6 Tabel `realisasi_anggaran`

Setiap kali ada pengeluaran yang terealisasi, PIC menginput detailnya ke tabel ini. Serapan anggaran per pos dikalkulasi dengan menjumlahkan kolom `jumlah` berdasarkan `anggaran_pos_id`.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `anggaran_pos_id` | UUID | No | FK ke `anggaran_pos.id` |
| `pic_user_id` | UUID | No | FK ke `users.id` — staff yang menginput |
| `kegiatan` | VARCHAR(500) | No | Nama kegiatan yang menggunakan anggaran ini |
| `jumlah` | DECIMAL(15,2) | No | Jumlah rupiah yang terserap |
| `nd_realisasi` | VARCHAR(100) | Yes | Nomor Nota Dinas realisasi |
| `dokumen_url` | TEXT | Yes | Link atau path file dokumen wabku |
| `tanggal_input` | DATE | No | Tanggal realisasi terjadi |
| `created_at` | TIMESTAMP | No | Waktu record dibuat |
| `updated_at` | TIMESTAMP | No | Waktu terakhir diubah |

---

### 5.7 Tabel `link_penting`

Tabel sederhana yang menyimpan daftar link penting unit kerja. Data default diisi dari Lampiran I BRS (20 link). Hanya Level 2 ke atas yang bisa mengedit.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `nama_link` | VARCHAR(255) | No | Label / nama tampilan link |
| `url` | TEXT | No | URL lengkap |
| `urutan` | SMALLINT | No | Angka urutan untuk sorting tampilan |
| `is_active` | BOOLEAN | No | Jika false, tidak ditampilkan ke user |
| `created_at` | TIMESTAMP | No | Waktu dibuat |
| `updated_at` | TIMESTAMP | No | Waktu terakhir diubah |

---

### 5.8 Tabel `notifications`

Menyimpan notifikasi in-app yang diterima setiap user. Notifikasi juga dikirim via email, tapi record tetap tersimpan di sini agar bisa ditampilkan di bell icon aplikasi.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK ke `users.id` — penerima notifikasi |
| `type` | ENUM(NotificationType) | No | Tipe notifikasi |
| `title` | VARCHAR(255) | No | Judul notifikasi singkat |
| `message` | TEXT | No | Isi pesan notifikasi |
| `is_read` | BOOLEAN | No | Default false. True jika sudah dibaca |
| `project_id` | UUID | Yes | Referensi opsional ke project terkait (bukan FK strict, hanya informasi) |
| `created_at` | TIMESTAMP | No | Waktu notifikasi dibuat |

---

## 6. Schema Prisma Lengkap

File ini disimpan di `apps/backend/prisma/schema.prisma`.

```prisma
// ================================================================
// PRISMA SCHEMA — Aplikasi ROCKET
// PT ASABRI (Persero) | Bidang Komunikasi dan Protokoler
// ================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ================================================================
// ENUM DEFINITIONS
// ================================================================

// Role user yang terintegrasi dengan Active Directory
enum UserRole {
  SUPER_USER  // Akses penuh, bisa ubah nama karyawan
  LEVEL_1     // Sesper (Sekretaris Perusahaan) — review akhir
  LEVEL_2     // Kabid (Kepala Bidang) — review pertama
  LEVEL_3     // Staff — input dan update pekerjaan sendiri
}

// Status siklus hidup sebuah project
enum ProjectStatus {
  FINISHED        // Selesai dan telah disetujui
  ON_GOING        // Sedang dikerjakan
  TO_DO_NEXT      // Project selanjutnya (belum mulai)
  NEED_FOLLOW_UP  // Menunggu review / approval dari atasan
  CANCELLED       // Dibatalkan
  RESCHEDULED     // Dijadwal ulang (due date berubah)
  REVISI          // Sedang dalam proses revisi oleh staff
}

// Status setiap aksi dalam proses review berjenjang
enum ReviewStatus {
  PENDING   // Baru diajukan oleh staff, menunggu Kabid
  REVIEWED  // Sudah di-review Kabid, menunggu Kadiv/Sesper
  APPROVED  // Disetujui final (project → FINISHED)
  REVISION  // Dikembalikan dengan catatan revisi
}

// Tipe notifikasi yang dikirim ke user
enum NotificationType {
  DUE_DATE_REMINDER   // Peringatan H-3 sebelum due date
  REVIEW_REQUESTED    // Staff mengajukan review ke Kabid
  REVIEW_TO_KADIV     // Kabid meneruskan review ke Kadiv/Sesper
  REVIEW_APPROVED     // Kadiv/Sesper menyetujui project
  REVIEW_REVISION     // Project dikembalikan untuk direvisi
}

// ================================================================
// CLUSTER 1: USER & AUTH
// ================================================================

model User {
  id           String    @id @default(uuid())
  ad_username  String    @unique   // Username AD, contoh: "budi.santoso"
  email        String    @unique   // Email dari AD
  full_name    String               // Bisa diubah oleh Super User
  role         UserRole  @default(LEVEL_3)
  is_active    Boolean   @default(true)
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  // Relasi: project yang di-PIC-kan ke user ini
  projects_as_pic      Project[]          @relation("ProjectPIC")

  // Relasi: sub project yang di-PIC-kan ke user ini
  sub_projects_as_pic  SubProject[]       @relation("SubProjectPIC")

  // Relasi: aksi review yang dilakukan user ini (sebagai reviewer)
  reviews_given        ProjectReview[]    @relation("ReviewerUser")

  // Relasi: realisasi anggaran yang diinput oleh user ini
  realisasi_inputs     RealisasiAnggaran[]

  // Relasi: notifikasi milik user ini
  notifications        Notification[]

  @@map("users")
}

// ================================================================
// CLUSTER 2: WORKING TRACKER
// ================================================================

model Project {
  id              String        @id @default(uuid())
  name            String        // Judul / nama project atau kegiatan
  working_folder  String?       // URL ke folder kerja (SharePoint, Drive, dll)
  update_notes    String?       @db.Text  // Progress update terkini
  due_date        DateTime      // Due date project inti (bukan sub project)
  status          ProjectStatus @default(TO_DO_NEXT)
  month           Int           // Bulan pengerjaan (1 = Januari, dst)
  year            Int           // Tahun pengerjaan
  client          String?       // Unit kerja / client
  keterangan      String?       @db.Text  // Catatan tambahan
  document_url    String?       // URL dokumen pendukung

  pic_user_id     String
  pic             User          @relation("ProjectPIC", fields: [pic_user_id], references: [id])

  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt
  deleted_at      DateTime?     // Soft delete: null = aktif

  // Relasi ke sub project (cascade delete)
  sub_projects    SubProject[]

  // Relasi ke histori review
  reviews         ProjectReview[]

  @@map("projects")
}

model SubProject {
  id            String        @id @default(uuid())
  name          String        // Nama sub project / task
  due_date      DateTime      // Due date sub project ini (independen dari induk)
  status        ProjectStatus @default(TO_DO_NEXT)
  update_notes  String?       @db.Text
  keterangan    String?       @db.Text

  // Relasi ke project induk
  project_id    String
  project       Project       @relation(fields: [project_id], references: [id], onDelete: Cascade)

  // PIC khusus sub project ini (bisa berbeda dengan PIC project induk)
  pic_user_id   String
  pic           User          @relation("SubProjectPIC", fields: [pic_user_id], references: [id])

  created_at    DateTime      @default(now())
  updated_at    DateTime      @updatedAt

  @@map("sub_projects")
}

model ProjectReview {
  id            String        @id @default(uuid())

  // Project yang sedang di-review
  project_id    String
  project       Project       @relation(fields: [project_id], references: [id])

  // User yang melakukan aksi review ini
  reviewer_id   String
  reviewer      User          @relation("ReviewerUser", fields: [reviewer_id], references: [id])

  status        ReviewStatus
  comment       String?       @db.Text  // Catatan revisi (diisi jika status = REVISION)
  review_stage  Int           @default(1)  // 1 = Staff→Kabid, 2 = Kabid→Kadiv/Sesper

  reviewed_at   DateTime      @default(now())

  @@map("project_reviews")
}

// ================================================================
// CLUSTER 3: ANGGARAN
// ================================================================

model AnggaranPos {
  id              String    @id @default(uuid())
  nama_pos        String    // Nama pos anggaran sesuai RKAP
  total_anggaran  Decimal   @db.Decimal(15, 2)  // Pagu anggaran (rupiah)
  tahun           Int       // Tahun anggaran
  keterangan      String?   @db.Text

  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  // Relasi ke detail realisasi
  realisasi       RealisasiAnggaran[]

  @@map("anggaran_pos")
}

model RealisasiAnggaran {
  id              String      @id @default(uuid())

  // Pos anggaran yang digunakan
  anggaran_pos_id String
  anggaran_pos    AnggaranPos @relation(fields: [anggaran_pos_id], references: [id])

  // Staff yang menginput realisasi ini
  pic_user_id     String
  pic             User        @relation(fields: [pic_user_id], references: [id])

  kegiatan        String      // Nama kegiatan yang menggunakan anggaran
  jumlah          Decimal     @db.Decimal(15, 2)  // Jumlah rupiah yang terserap
  nd_realisasi    String?     // Nomor Nota Dinas realisasi keuangan
  dokumen_url     String?     // Link atau path file dokumen wajib bayar keuangan
  tanggal_input   DateTime    @default(now())  // Tanggal realisasi terjadi

  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt

  @@map("realisasi_anggaran")
}

// ================================================================
// CLUSTER 4: KONTEN & NOTIFIKASI
// ================================================================

model LinkPenting {
  id          String    @id @default(uuid())
  nama_link   String    // Label tampilan, contoh: "RKAP 2024"
  url         String    @db.Text  // URL lengkap
  urutan      Int       // Angka urutan untuk sorting di UI
  is_active   Boolean   @default(true)

  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  @@map("link_penting")
}

model Notification {
  id          String            @id @default(uuid())

  user_id     String
  user        User              @relation(fields: [user_id], references: [id])

  type        NotificationType
  title       String            // Judul singkat notifikasi
  message     String            @db.Text  // Isi lengkap notifikasi
  is_read     Boolean           @default(false)

  // Referensi ke project terkait (opsional, bukan strict FK)
  project_id  String?

  created_at  DateTime          @default(now())

  @@map("notifications")
}
```

---

## 7. Indeks & Optimasi Query

Prisma secara otomatis membuat indeks untuk semua kolom yang didefinisikan sebagai `@unique` dan `@id`. Namun untuk query yang sering dilakukan (terutama di dashboard), kita perlu menambahkan indeks tambahan secara manual ke dalam schema.

```prisma
// Tambahkan ini ke dalam model Project:
@@index([pic_user_id])           // Filter pekerjaan by PIC
@@index([status])                 // Filter by status
@@index([month, year])            // Filter by bulan dan tahun
@@index([due_date])               // Cek due date (H-3 alert)
@@index([deleted_at])             // Exclude soft-deleted records

// Tambahkan ini ke dalam model SubProject:
@@index([project_id])             // Fetch sub projects dari project tertentu
@@index([pic_user_id])            // Filter sub project by PIC

// Tambahkan ini ke dalam model ProjectReview:
@@index([project_id])             // Fetch semua review dari satu project
@@index([status, review_stage])   // Filter review yang pending per tahap

// Tambahkan ini ke dalam model RealisasiAnggaran:
@@index([anggaran_pos_id])        // SUM realisasi per pos anggaran
@@index([tanggal_input])          // Filter realisasi by tanggal

// Tambahkan ini ke dalam model Notification:
@@index([user_id, is_read])       // Fetch notifikasi belum dibaca per user
```

---

## 8. State Machine Status Project

Transisi status project harus dikontrol di level **service backend** agar tidak ada status yang berubah secara tidak valid. Berikut adalah aturan transisinya:

```
TO_DO_NEXT
    │
    ▼ (staff mulai mengerjakan)
ON_GOING ──────────────────────────────► CANCELLED
    │                                        ▲
    │ (due date berubah)                      │
    ├──────────────────────► RESCHEDULED ────┘ (tetap bisa dibatalkan)
    │
    │ (staff mengajukan review)
    ▼
NEED_FOLLOW_UP
    │
    ├── (Kabid/Kadiv memberikan revisi) ──► REVISI
    │                                          │
    │                                          │ (staff selesai revisi)
    │                                          ▼
    │                                      NEED_FOLLOW_UP (ulang)
    │
    └── (Kadiv/Sesper approve) ──────────► FINISHED
```

---

## 9. Kalkulasi Anggaran

Persentase serapan anggaran **tidak disimpan sebagai kolom** melainkan dihitung secara *real-time* menggunakan query agregasi. Ini memastikan angka selalu akurat. Berikut query SQL-nya:

```sql
-- Kalkulasi serapan per pos anggaran untuk tahun tertentu
SELECT
  ap.id,
  ap.nama_pos,
  ap.total_anggaran,
  COALESCE(SUM(ra.jumlah), 0) AS total_terserap,
  COALESCE(SUM(ra.jumlah), 0) / ap.total_anggaran * 100 AS persentase_serapan
FROM anggaran_pos ap
LEFT JOIN realisasi_anggaran ra ON ra.anggaran_pos_id = ap.id
WHERE ap.tahun = 2025
GROUP BY ap.id, ap.nama_pos, ap.total_anggaran
ORDER BY ap.nama_pos;
```

Di Prisma, ini diimplementasikan menggunakan `groupBy` atau `$queryRaw`:

```typescript
// Di anggaran.service.ts
async getSerapanPerPos(tahun: number) {
  const result = await this.prisma.$queryRaw`
    SELECT
      ap.id,
      ap.nama_pos,
      ap.total_anggaran::float,
      COALESCE(SUM(ra.jumlah), 0)::float AS total_terserap,
      CASE
        WHEN ap.total_anggaran > 0
        THEN COALESCE(SUM(ra.jumlah), 0) / ap.total_anggaran * 100
        ELSE 0
      END::float AS persentase_serapan
    FROM anggaran_pos ap
    LEFT JOIN realisasi_anggaran ra ON ra.anggaran_pos_id = ap.id
    WHERE ap.tahun = ${tahun}
    GROUP BY ap.id, ap.nama_pos, ap.total_anggaran
    ORDER BY ap.nama_pos
  `;
  return result;
}
```

---

## 10. Seeding Data Awal

File seed disimpan di `apps/backend/prisma/seed.ts`. Seed ini dijalankan sekali saat pertama kali setup production.

```typescript
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  // --- SEED USERS ---
  // Data dummy karyawan untuk development
  const usersData = [
    { ad_username: 'user.staff1',   email: 'user.staff1@company.co.id',   full_name: 'Staff Satu',       role: UserRole.LEVEL_3 },
    { ad_username: 'user.staff2',   email: 'user.staff2@company.co.id',   full_name: 'Staff Dua',        role: UserRole.LEVEL_3 },
    { ad_username: 'user.staff3',   email: 'user.staff3@company.co.id',   full_name: 'Staff Tiga',       role: UserRole.LEVEL_3 },
    { ad_username: 'user.staff4',   email: 'user.staff4@company.co.id',   full_name: 'Staff Empat',      role: UserRole.LEVEL_3 },
    { ad_username: 'user.staff5',   email: 'user.staff5@company.co.id',   full_name: 'Staff Lima',       role: UserRole.LEVEL_3 },
    { ad_username: 'user.staff6',   email: 'user.staff6@company.co.id',   full_name: 'Staff Enam',       role: UserRole.LEVEL_3 },
    { ad_username: 'user.manager',  email: 'user.manager@company.co.id',  full_name: 'Manager Divisi',   role: UserRole.LEVEL_2 },
    { ad_username: 'user.kadiv',    email: 'user.kadiv@company.co.id',    full_name: 'Kepala Divisi',    role: UserRole.LEVEL_1 },
    { ad_username: 'user.superuser', email: 'user.superuser@company.co.id', full_name: 'Super User',     role: UserRole.SUPER_USER },
  ];

  for (const user of usersData) {
    await prisma.user.upsert({
      where: { ad_username: user.ad_username },
      update: {},
      create: user,
    });
  }

  // --- SEED LINK PENTING ---
  // Link penting unit kerja (contoh placeholder)
  const linksData = [
    { nama_link: 'Dokumen RKAP',               url: 'https://yourcloud.sharepoint.com/rkap', urutan: 1 },
    { nama_link: 'Foto Annual Report',          url: 'https://yourcloud.sharepoint.com/annual-report', urutan: 2 },
    { nama_link: 'KPI & Assignment',            url: 'https://yourcloud.sharepoint.com/kpi', urutan: 3 },
    { nama_link: 'List Media Release',          url: 'https://yourcloud.sharepoint.com/media-release', urutan: 4 },
    { nama_link: 'Template Media Plan',         url: 'https://yourcloud.sharepoint.com/media-plan', urutan: 5 },
    { nama_link: 'Editorial Plan Media Sosial', url: 'https://yourcloud.sharepoint.com/ep-medsos', urutan: 6 },
    { nama_link: 'Media Monitoring',            url: 'https://yourcloud.sharepoint.com/monitoring', urutan: 7 },
    { nama_link: 'Link Nota Dinas',             url: 'https://yourcloud.sharepoint.com/nota-dinas', urutan: 8 },
    { nama_link: 'Monitoring Realisasi RKAP',   url: 'https://yourcloud.sharepoint.com/realisasi', urutan: 9 },
    { nama_link: 'List Perlengkapan',           url: 'https://yourcloud.sharepoint.com/perlengkapan', urutan: 10 },
    { nama_link: 'SOP Tahun Berjalan',          url: 'https://yourcloud.sharepoint.com/sop', urutan: 11 },
    { nama_link: 'Company Profile',             url: 'https://yourcloud.sharepoint.com/company-profile', urutan: 12 },
  ];

  for (const link of linksData) {
    await prisma.linkPenting.upsert({
      where: { id: link.urutan.toString() },
      update: {},
      create: link,
    });
  }

  console.log('✅ Seed selesai. Database siap digunakan.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

---

## 11. Backup & Migrasi Strategy

**Migrasi database** dilakukan menggunakan perintah Prisma:

```bash
# Membuat file migrasi baru setelah mengubah schema.prisma
npx prisma migrate dev --name nama_perubahan

# Menerapkan migrasi ke production
npx prisma migrate deploy

# Melihat status migrasi
npx prisma migrate status
```

**Backup otomatis** PostgreSQL dikonfigurasi menggunakan `pg_dump` yang dijadwalkan via cron:

```bash
# Contoh cron job — backup setiap hari jam 02.00
0 2 * * * pg_dump -U rocket_user -d rocket_db | gzip > /backup/rocket_$(date +\%Y\%m\%d).sql.gz
```

Backup disimpan minimal **30 hari terakhir** dan disimpan di storage yang terpisah dari server aplikasi.
