# 🔬 Update Kelompok 5 — Pendalaman Fitur Inti
### Aplikasi ROCKET | PT ASABRI (Persero)
> **Prioritas:** Tinggi — Dikerjakan segera setelah Kelompok 4 stabil
> **Estimasi Total:** 4–5 minggu pengerjaan
> **Dampak:** Membuat fitur yang sudah ada menjadi jauh lebih powerful dan reliable

---

## Filosofi Kelompok Ini

Ada analogi yang tepat untuk menggambarkan apa yang dilakukan kelompok ini. Bayangkan Anda baru saja membangun sebuah rumah yang fungsional — ada kamar tidur, dapur, ruang tamu, dan kamar mandi. Kelompok 1 sampai 4 adalah proses membangun ruangan-ruangan itu. Kelompok 5 adalah tentang memasang listrik yang lebih andal, pipa air yang tidak bocor, dan insulasi yang membuat rumah nyaman di segala cuaca. Penghuninya tidak selalu sadar dengan perubahan ini, tetapi mereka merasakannya setiap hari.

Tiga fitur di kelompok ini — Document Management, Full-Text Search, dan Recurring Projects — masing-masing menyelesaikan satu "kebocoran" yang ada di sistem saat ini. Document Management menyelesaikan masalah link mati dan tidak adanya versioning. Full-Text Search menyelesaikan masalah ketidakmampuan menemukan konten yang sudah ada. Recurring Projects menyelesaikan masalah pekerjaan manual yang berulang setiap periode. Ketiganya adalah penyempurnaan yang substansial, bukan sekadar kosmetik.

---

## Daftar Isi

1. [Fitur 5.1 — Document & File Management Terpusat](#fitur-51--document--file-management-terpusat)
2. [Fitur 5.2 — Full-Text Search Lintas Konten](#fitur-52--full-text-search-lintas-konten)
3. [Fitur 5.3 — Recurring Project & Scheduled Tasks](#fitur-53--recurring-project--scheduled-tasks)
4. [Urutan Implementasi yang Disarankan](#urutan-implementasi-yang-disarankan)

---

## Fitur 5.1 — Document & File Management Terpusat

### Latar Belakang & Nilai Bisnis

Mari kita pikirkan situasi yang sangat konkret. Seorang Staff mengupload SOP Kegiatan Protokol Direksi sebagai dokumen pendukung sebuah project, dan menyimpan URL SharePoint-nya di field `document_url`. Tiga bulan kemudian, rekan kerjanya membuka project yang sama dan mendapati link tersebut mati karena file telah dipindahkan. Tidak ada yang tahu versi mana yang "benar", tidak ada histori perubahan, dan tidak ada cara untuk mengetahui bahwa dokumen ini juga relevan untuk lima project lain yang sedang berjalan.

Inilah masalah yang diselesaikan oleh Document Management yang sesungguhnya. Fitur ini bukan sekadar tempat upload file — ia adalah **sistem pengetahuan berbasis dokumen** yang memungkinkan satu dokumen hidup secara mandiri, memiliki versi, dan bisa dikaitkan ke banyak project sekaligus.

### Perubahan Database

Arsitektur tabel yang diperlukan lebih kaya dari sekadar menambahkan kolom, karena kita perlu mendukung versioning dan relasi many-to-many antara dokumen dan project.

```prisma
// Tabel utama dokumen — setiap baris adalah satu "dokumen" secara konseptual.
// Bukan setiap file fisik, melainkan setiap entitas dokumen yang bisa memiliki banyak versi.
model Document {
  id           String   @id @default(uuid())
  title        String   // Judul dokumen, contoh: "SOP Kegiatan Protokol Direksi"
  description  String?  @db.Text
  category     String?  // Kategori bebas: "SOP", "Template", "Laporan", dll

  // Siapa yang pertama kali mengupload dokumen ini
  uploaded_by_id String
  uploaded_by    User   @relation("DocumentUploader", fields: [uploaded_by_id], references: [id])

  is_active    Boolean  @default(true)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  // Relasi ke versi-versi file dari dokumen ini
  versions     DocumentVersion[]

  // Relasi many-to-many ke project yang menggunakan dokumen ini
  project_links ProjectDocument[]

  @@map("documents")
}

// Setiap baris di tabel ini adalah satu versi file fisik dari sebuah dokumen.
// Ketika dokumen diupdate, versi lama tidak dihapus — versi baru ditambahkan.
model DocumentVersion {
  id           String   @id @default(uuid())
  document_id  String
  document     Document @relation(fields: [document_id], references: [id], onDelete: Cascade)

  version_number Int    // 1, 2, 3, dst — di-increment otomatis oleh service
  file_name    String   // Nama file asli saat diupload
  file_path    String   // Path penyimpanan di server atau object storage
  file_size    Int      // Ukuran file dalam bytes
  mime_type    String   // "application/pdf", "image/jpeg", dll
  change_notes String?  // Catatan perubahan dari versi sebelumnya

  // Siapa yang mengupload versi ini
  uploaded_by_id String
  uploaded_by    User   @relation("VersionUploader", fields: [uploaded_by_id], references: [id])

  is_latest    Boolean  @default(true) // Hanya satu versi yang bisa is_latest = true
  created_at   DateTime @default(now())

  @@index([document_id, version_number])
  @@map("document_versions")
}

// Tabel pivot yang menghubungkan dokumen ke project.
// Satu dokumen bisa dikaitkan ke banyak project, satu project bisa memiliki banyak dokumen.
model ProjectDocument {
  id          String   @id @default(uuid())
  project_id  String
  project     Project  @relation(fields: [project_id], references: [id], onDelete: Cascade)
  document_id String
  document    Document @relation(fields: [document_id], references: [id])

  // Siapa yang mengaitkan dokumen ini ke project
  linked_by_id String
  linked_by    User   @relation("DocumentLinker", fields: [linked_by_id], references: [id])
  linked_at    DateTime @default(now())

  @@unique([project_id, document_id]) // Satu dokumen tidak bisa dikaitkan dua kali ke project yang sama
  @@map("project_documents")
}
```

Tambahkan relasi balik di model yang relevan:

```prisma
// Di model Project:
documents    ProjectDocument[]

// Di model User:
documents_uploaded   Document[]        @relation("DocumentUploader")
versions_uploaded    DocumentVersion[] @relation("VersionUploader")
documents_linked     ProjectDocument[] @relation("DocumentLinker")
```

### Perubahan Backend

Buat modul baru `documents` dengan service yang mengelola seluruh lifecycle dokumen. Bagian yang paling krusial adalah logika versioning — ketika versi baru diupload, sistem harus otomatis menandai versi sebelumnya sebagai bukan versi terkini:

```typescript
// documents.service.ts

@Injectable()
export class DocumentsService {
  constructor(
    private prisma  : PrismaService,
    private storage : StorageService, // Service abstraksi untuk file storage
  ) {}

  // Upload dokumen baru (versi pertama)
  async create(dto: CreateDocumentDto, file: Express.Multer.File, uploaderId: string) {
    // Simpan file ke storage terlebih dahulu
    const filePath = await this.storage.save(file, 'documents');

    // Buat record dokumen dan versi pertamanya dalam satu transaction
    // Transaction memastikan jika salah satu gagal, keduanya di-rollback
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          title          : dto.title,
          description    : dto.description,
          category       : dto.category,
          uploaded_by_id : uploaderId,
        }
      });

      await tx.documentVersion.create({
        data: {
          document_id    : document.id,
          version_number : 1,
          file_name      : file.originalname,
          file_path      : filePath,
          file_size      : file.size,
          mime_type      : file.mimetype,
          change_notes   : 'Versi pertama',
          uploaded_by_id : uploaderId,
          is_latest      : true,
        }
      });

      return document;
    });
  }

  // Upload versi baru dari dokumen yang sudah ada
  async addVersion(
    documentId : string,
    dto        : AddVersionDto,
    file       : Express.Multer.File,
    uploaderId : string
  ) {
    const filePath = await this.storage.save(file, 'documents');

    return this.prisma.$transaction(async (tx) => {
      // Hitung nomor versi berikutnya
      const latestVersion = await tx.documentVersion.findFirst({
        where  : { document_id: documentId },
        orderBy: { version_number: 'desc' }
      });
      const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1;

      // Tandai semua versi lama sebagai bukan terkini
      await tx.documentVersion.updateMany({
        where: { document_id: documentId },
        data : { is_latest: false }
      });

      // Buat versi baru
      return tx.documentVersion.create({
        data: {
          document_id    : documentId,
          version_number : nextVersionNumber,
          file_name      : file.originalname,
          file_path      : filePath,
          file_size      : file.size,
          mime_type      : file.mimetype,
          change_notes   : dto.change_notes,
          uploaded_by_id : uploaderId,
          is_latest      : true,
        }
      });
    });
  }

  // Ambil URL untuk preview/download versi tertentu
  async getDownloadUrl(documentId: string, versionNumber?: number) {
    const version = await this.prisma.documentVersion.findFirstOrThrow({
      where: {
        document_id    : documentId,
        version_number : versionNumber ?? undefined,
        is_latest      : versionNumber ? undefined : true,
      }
    });
    // StorageService menghasilkan signed URL yang valid selama 1 jam
    return this.storage.getSignedUrl(version.file_path);
  }
}
```

`StorageService` adalah abstraksi layer yang penting — ia memungkinkan kita mengganti backend penyimpanan (dari local disk ke MinIO ke SharePoint) tanpa mengubah kode di `DocumentsService`:

```typescript
// storage.service.ts — abstraksi layer untuk file storage

@Injectable()
export class StorageService {
  // Menyimpan file dan mengembalikan path-nya
  async save(file: Express.Multer.File, subfolder: string): Promise<string> {
    const uniqueName = `${subfolder}/${Date.now()}-${file.originalname}`;
    // Untuk implementasi awal: simpan ke local disk di folder /uploads
    // Untuk production: ganti dengan MinIO atau SharePoint API
    const destPath = path.join(process.env.UPLOAD_DEST, uniqueName);
    await fs.promises.writeFile(destPath, file.buffer);
    return uniqueName;
  }

  // Generate URL yang bisa diakses untuk download atau preview
  async getSignedUrl(filePath: string): Promise<string> {
    // Untuk local storage: kembalikan URL langsung
    return `${process.env.BACKEND_URL}/files/${filePath}`;
  }
}
```

### Perubahan Frontend

Komponen utama yang dibutuhkan adalah `DocumentManager` yang ditampilkan di tab baru "Dokumen" di `ProjectDetailPage`. Komponen ini menampilkan dua hal: daftar dokumen yang sudah terkait dengan project ini, dan kemampuan untuk menambah atau mengaitkan dokumen baru.

Untuk preview PDF in-browser, gunakan library `@react-pdf-viewer/core` yang memungkinkan pengguna melihat PDF langsung di dalam modal tanpa harus mengunduhnya. Untuk gambar, cukup menggunakan `<img>` tag biasa dengan lazy loading.

---

## Fitur 5.2 — Full-Text Search Lintas Konten

### Latar Belakang & Nilai Bisnis

Pernahkah Anda mencari sebuah catatan penting yang Anda tahu pernah ditulis, tetapi tidak ingat di project mana? Atau ingin menemukan semua diskusi yang pernah menyebut kata "direksi" untuk mempersiapkan laporan? Dengan ratusan project, ribuan komentar, dan puluhan dokumen, pencarian konvensional (filter by name) menjadi tidak cukup.

Full-Text Search menyelesaikan ini dengan cara yang elegan menggunakan fitur yang sudah ada di PostgreSQL — tidak perlu infrastruktur tambahan, tidak perlu server Elasticsearch yang harus di-maintain. PostgreSQL sudah memiliki mesin full-text search yang sangat capable, dan kita hanya perlu mengaktifkannya.

Konsep kuncinya adalah `tsvector` — sebuah tipe data PostgreSQL yang menyimpan representasi terindeks dari teks, dan `tsquery` — format query yang digunakan untuk mencarinya. Ketika pengguna mengetik "protokol direksi", PostgreSQL melakukan pencarian yang jauh lebih cerdas dari `ILIKE '%protokol direksi%'`: ia memahami bentuk kata dasar (*stemming*), mengabaikan kata-kata umum (*stop words*), dan menghitung relevansi hasil (*ranking*).

### Perubahan Database

Tambahkan kolom `search_vector` ke tabel-tabel yang ingin dicari, dan buat trigger yang otomatis memperbarui kolom ini setiap kali konten berubah:

```prisma
// Tambahkan di model Project:
search_vector Unsupported("tsvector")? // Kolom indeks pencarian

// Tambahkan di model ProjectComment (dari Kelompok 1):
search_vector Unsupported("tsvector")?
```

Karena Prisma belum mendukung `tsvector` secara native, kita perlu membuat migration SQL secara manual. Buat file migration baru di `prisma/migrations/`:

```sql
-- Migration: add_full_text_search
-- Bagian ini menambahkan kolom tsvector dan trigger ke tabel projects

-- Langkah 1: Tambahkan kolom search_vector
ALTER TABLE projects ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE project_comments ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Langkah 2: Buat indeks GIN (Generalized Inverted Index) pada kolom ini.
-- GIN adalah tipe indeks yang dioptimalkan khusus untuk full-text search.
-- Tanpa indeks ini, pencarian teks akan sangat lambat pada tabel besar.
CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_comments_fts ON project_comments USING GIN(search_vector);

-- Langkah 3: Buat fungsi trigger yang memperbarui search_vector
-- ketika data di baris project berubah.
-- 'indonesian' menggunakan konfigurasi bahasa Indonesia untuk stemming.
-- Jika tidak tersedia, gunakan 'simple' sebagai fallback.
CREATE OR REPLACE FUNCTION update_project_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    -- Bobot 'A' (tertinggi) untuk nama project
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    -- Bobot 'B' untuk update notes dan client
    setweight(to_tsvector('simple', coalesce(NEW.update_notes, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.client, '')), 'B') ||
    -- Bobot 'C' (terendah) untuk keterangan
    setweight(to_tsvector('simple', coalesce(NEW.keterangan, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Langkah 4: Pasang trigger ke tabel
CREATE TRIGGER trg_update_project_search_vector
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_project_search_vector();

-- Langkah 5: Isi search_vector untuk semua data yang sudah ada
UPDATE projects SET name = name; -- Ini memicu trigger untuk semua baris
```

### Perubahan Backend

Buat endpoint pencarian di modul yang sudah ada. Karena `$queryRaw` diperlukan untuk query full-text search, kita perlu menulisnya secara eksplisit:

```typescript
// search.service.ts (modul baru, atau tambahkan di projects.service.ts)

async globalSearch(query: string, userId: string, userRole: UserRole) {
  if (!query || query.trim().length < 2) {
    return { projects: [], comments: [] };
  }

  // Format query untuk PostgreSQL tsquery.
  // 'protokol direksi' menjadi 'protokol & direksi' (AND search)
  // Tanda ':*' berarti prefix matching — 'prot' akan cocok dengan 'protokol'
  const tsQuery = query.trim().split(/\s+/)
    .map(word => `${word}:*`)
    .join(' & ');

  // Batasi akses data berdasarkan role
  const roleFilter = userRole === UserRole.LEVEL_3
    ? `AND p.pic_user_id = '${userId}'`
    : '';

  const projectResults = await this.prisma.$queryRaw<any[]>`
    SELECT
      p.id,
      p.name,
      p.status,
      p.due_date,
      u.full_name AS pic_name,
      -- ts_rank menghitung skor relevansi (0.0 - 1.0)
      ts_rank(p.search_vector, to_tsquery('simple', ${tsQuery})) AS relevance,
      -- ts_headline menghasilkan cuplikan teks dengan kata yang cocok di-highlight
      ts_headline('simple', p.name,
        to_tsquery('simple', ${tsQuery}),
        'MaxWords=10, MinWords=5'
      ) AS headline
    FROM projects p
    JOIN users u ON u.id = p.pic_user_id
    WHERE
      p.deleted_at IS NULL
      AND p.search_vector @@ to_tsquery('simple', ${tsQuery})
      ${Prisma.raw(roleFilter)}
    ORDER BY relevance DESC
    LIMIT 10
  `;

  const commentResults = await this.prisma.$queryRaw<any[]>`
    SELECT
      c.id,
      c.message,
      c.project_id,
      p.name AS project_name,
      u.full_name AS author_name,
      ts_rank(c.search_vector, to_tsquery('simple', ${tsQuery})) AS relevance,
      ts_headline('simple', c.message,
        to_tsquery('simple', ${tsQuery}),
        'MaxWords=15, MinWords=8'
      ) AS headline
    FROM project_comments c
    JOIN projects p ON p.id = c.project_id
    JOIN users u ON u.id = c.author_id
    WHERE
      c.search_vector @@ to_tsquery('simple', ${tsQuery})
      AND p.deleted_at IS NULL
    ORDER BY relevance DESC
    LIMIT 10
  `;

  return {
    projects: projectResults,
    comments: commentResults,
    total   : projectResults.length + commentResults.length,
  };
}
```

### Perubahan Frontend

Tambahkan komponen `GlobalSearchBar` di `Navbar.tsx` — sebuah input dengan ikon kaca pembesar yang bisa diaktifkan dengan shortcut keyboard `Ctrl+K` (atau `Cmd+K` di Mac), mengikuti konvensi yang sudah familiar bagi pengguna modern.

Hasil pencarian ditampilkan dalam dropdown di bawah search bar, dikelompokkan per kategori (Project, Komentar) dengan highlight pada kata yang cocok menggunakan HTML yang di-return oleh `ts_headline`. Klik pada hasil membawa pengguna langsung ke halaman yang relevan — project detail untuk hasil project, atau project detail dengan komentar yang di-highlight untuk hasil komentar.

---

## Fitur 5.3 — Recurring Project & Scheduled Tasks

### Latar Belakang & Nilai Bisnis

Dalam satu tahun, tim Kompro ASABRI menjalankan puluhan kegiatan yang bersifat siklikal. Buletin internal terbit setiap bulan. Monitoring media dilakukan setiap minggu. Rekap anggaran dikerjakan setiap akhir kuartal. Tanpa fitur ini, Staff harus membuat project yang hampir identik berulang kali — menghabiskan waktu yang seharusnya bisa dipakai untuk bekerja secara substansial.

Perbedaan mendasar antara Recurring Projects dan Template Projects (Kelompok 2) perlu dipahami dengan jelas. Template adalah cetakan yang digunakan secara manual ketika seseorang memutuskan untuk membuat project baru yang serupa. Recurring adalah jadwal otomatis yang membuat project tanpa intervensi manusia — ia berjalan bahkan ketika tidak ada yang memikirkannya.

### Perubahan Database

```prisma
model RecurringConfig {
  id          String @id @default(uuid())
  name        String // Nama konfigurasi, contoh: "Buletin Internal Bulanan"

  // Pola pengulangan — dipilih menggunakan enum sederhana
  // untuk menghindari kompleksitas cron expression bagi pengguna awam
  pattern     RecurringPattern

  // Untuk pola WEEKLY: hari apa dalam seminggu (0=Minggu, 1=Senin, dst)
  day_of_week Int?
  // Untuk pola MONTHLY: tanggal berapa dalam sebulan (1-28)
  day_of_month Int?
  // Untuk pola QUARTERLY: bulan ke berapa dalam kuartal (1, 2, atau 3)
  month_in_quarter Int?

  // Berapa hari sebelum tanggal trigger, project harus sudah dibuat?
  // Contoh: advance_days = 7 berarti project untuk bulan Februari
  // dibuat pada 24 Januari (7 hari sebelum 1 Februari)
  advance_days Int @default(7)

  // Template data project yang akan dibuat — disimpan sebagai JSON
  // berisi name, client, pic_user_id, dan template_id (opsional)
  project_template Json

  is_active    Boolean  @default(true)
  created_by_id String
  created_by   User     @relation(fields: [created_by_id], references: [id])

  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  // Log setiap kali konfigurasi ini menghasilkan project baru
  execution_logs RecurringExecutionLog[]

  @@map("recurring_configs")
}

enum RecurringPattern {
  DAILY      // Setiap hari
  WEEKLY     // Setiap minggu pada hari tertentu
  BIWEEKLY   // Setiap dua minggu
  MONTHLY    // Setiap bulan pada tanggal tertentu
  QUARTERLY  // Setiap kuartal
}

// Log eksekusi — mencatat setiap kali cron job menghasilkan project baru
// Berguna untuk debugging dan audit trail
model RecurringExecutionLog {
  id               String          @id @default(uuid())
  config_id        String
  config           RecurringConfig @relation(fields: [config_id], references: [id])

  // Project yang berhasil dibuat dari eksekusi ini
  project_id       String?
  project          Project?        @relation(fields: [project_id], references: [id])

  status           String          // "SUCCESS" atau "FAILED"
  error_message    String?         // Diisi jika status = FAILED
  executed_at      DateTime        @default(now())

  @@map("recurring_execution_logs")
}
```

### Perubahan Backend

Tambahkan cron job baru di `scheduler.service.ts` yang memeriksa recurring config setiap hari dan menentukan mana yang perlu menghasilkan project hari ini:

```typescript
// scheduler.service.ts — tambahkan cron job ini

@Cron('0 6 * * *') // Setiap hari jam 06.00
async processRecurringProjects() {
  this.logger.log('Processing recurring project configurations...');

  const activeConfigs = await this.prisma.recurringConfig.findMany({
    where: { is_active: true }
  });

  for (const config of activeConfigs) {
    try {
      const shouldCreateToday = this.shouldCreateToday(config);
      if (!shouldCreateToday) continue;

      // Tentukan due date project baru berdasarkan pola
      const dueDate = this.calculateDueDate(config);

      // Cek apakah project untuk periode ini sudah pernah dibuat sebelumnya
      // (mencegah duplikasi jika cron job berjalan dua kali)
      const alreadyCreated = await this.checkAlreadyCreated(config.id, dueDate);
      if (alreadyCreated) continue;

      // Buat project baru dari template yang ada di config
      const template = config.project_template as any;
      const project = await this.prisma.project.create({
        data: {
          name        : this.interpolateName(template.name, dueDate),
          due_date    : dueDate,
          status      : ProjectStatus.TO_DO_NEXT,
          month       : dueDate.getMonth() + 1,
          year        : dueDate.getFullYear(),
          pic_user_id : template.pic_user_id,
          client      : template.client,
          keterangan  : `Dibuat otomatis dari recurring config: ${config.name}`,
        }
      });

      // Catat eksekusi yang berhasil
      await this.prisma.recurringExecutionLog.create({
        data: { config_id: config.id, project_id: project.id, status: 'SUCCESS' }
      });

      this.logger.log(`Recurring project created: ${project.name}`);

    } catch (error) {
      // Catat kegagalan tanpa menghentikan proses untuk config lainnya
      await this.prisma.recurringExecutionLog.create({
        data: { config_id: config.id, status: 'FAILED', error_message: error.message }
      });
      this.logger.error(`Failed to create recurring project for config ${config.id}: ${error.message}`);
    }
  }
}

// Tentukan apakah hari ini adalah hari yang tepat untuk membuat project baru
private shouldCreateToday(config: RecurringConfig): boolean {
  const today = new Date();
  const targetDate = subDays(this.calculateDueDate(config), config.advance_days);

  // Bandingkan hanya tanggal (bukan jam)
  return isSameDay(today, targetDate);
}

// Ganti placeholder di nama project dengan informasi periode
// Contoh: "Buletin Internal {MONTH} {YEAR}" → "Buletin Internal Maret 2025"
private interpolateName(template: string, date: Date): string {
  const monthName = format(date, 'MMMM', { locale: id }); // Bahasa Indonesia
  return template
    .replace('{MONTH}', monthName)
    .replace('{YEAR}', date.getFullYear().toString())
    .replace('{WEEK}', getWeek(date).toString())
    .replace('{QUARTER}', `Q${getQuarter(date)}`);
}
```

Buat juga modul `recurring` dengan CRUD endpoint agar Kabid bisa mengelola konfigurasi ini dari UI:

```typescript
// recurring.controller.ts

@Controller('recurring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecurringController {
  @Get()
  findAll() { return this.recurringService.findAll(); }

  @Post()
  @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
  create(@Body() dto: CreateRecurringDto, @CurrentUser() user: User) {
    return this.recurringService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
  update(@Param('id') id: string, @Body() dto: UpdateRecurringDto) {
    return this.recurringService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
  remove(@Param('id') id: string) {
    return this.recurringService.remove(id);
  }

  // Lihat riwayat eksekusi — berguna untuk debugging
  @Get(':id/logs')
  getLogs(@Param('id') id: string) {
    return this.recurringService.getExecutionLogs(id);
  }

  // Preview: kapan eksekusi berikutnya akan terjadi?
  @Get(':id/next-run')
  getNextRun(@Param('id') id: string) {
    return this.recurringService.calculateNextRun(id);
  }
}
```

### Perubahan Frontend

Tambahkan halaman `RecurringManagementPage.tsx` di Settings (hanya Level 2 ke atas). Halaman ini menampilkan daftar semua recurring config dalam bentuk kartu — setiap kartu menampilkan nama konfigurasi, pola pengulangan, PIC yang ditugaskan, dan tanggal eksekusi berikutnya. Ada juga tab "Riwayat Eksekusi" yang menampilkan log semua project yang pernah dibuat secara otomatis, termasuk yang gagal beserta alasan kegagalannya.

Form pembuatan recurring config perlu panduan yang intuitif. Daripada meminta pengguna mengisi cron expression yang teknis, tampilkan UI berbentuk wizard langkah demi langkah: pilih pola (radio button dengan label yang jelas), pilih hari/tanggal (tergantung pola), isi template data project (nama dengan placeholder yang didukung, PIC, client), dan preview kapan project pertama akan dibuat.

---

## Urutan Implementasi yang Disarankan

Urutan yang paling efisien untuk kelompok ini mengikuti logika dependensi yang jelas. **Full-Text Search** harus dikerjakan pertama karena ia tidak memiliki dependensi apapun terhadap fitur lain, dan manfaatnya dirasakan segera oleh semua pengguna yang mulai kesulitan menemukan informasi di antara data yang terus berkembang. Implementasi migration SQL-nya juga cukup singkat — sekitar 2-3 hari untuk backend dan frontend.

**Recurring Projects** dikerjakan kedua karena merupakan penambahan yang self-contained dan langsung menyelesaikan masalah nyata yang dihadapi setiap bulan. Pastikan untuk menguji konfigurasi scheduler secara menyeluruh sebelum diluncurkan ke production — bug di recurring job yang tidak terdeteksi bisa menghasilkan project duplikat atau project yang tidak terbuat sama sekali.

**Document Management** dikerjakan terakhir karena paling kompleks dan memerlukan keputusan arsitektur yang hati-hati tentang strategi penyimpanan file di server production ASABRI. Diskusi dengan tim IT tentang apakah menggunakan local storage, MinIO, atau integrasi dengan SharePoint yang sudah ada harus diselesaikan sebelum pengembangan dimulai.
