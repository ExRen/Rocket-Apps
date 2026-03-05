# 🏢 Update Kelompok 6 — Perluasan Domain Bisnis
### Aplikasi ROCKET | PT ASABRI (Persero)
> **Prioritas:** Menengah-Tinggi — Dikerjakan setelah Kelompok 5 stabil
> **Estimasi Total:** 6–8 minggu pengerjaan
> **Dampak:** Menambahkan kapabilitas domain bisnis baru yang belum ada di ROCKET

---

## Filosofi Kelompok Ini

Ada perbedaan yang sangat penting antara Kelompok 5 dan Kelompok 6 yang perlu dipahami sebelum memulai implementasi. Kelompok 5 memperdalam fitur yang sudah ada — ia bekerja dengan data dan domain yang sama, hanya dengan cara yang lebih kuat. Kelompok 6 berbeda: ia **memperkenalkan domain bisnis yang sama sekali baru** ke dalam ROCKET.

Analogi yang tepat adalah ini: Kelompok 5 seperti menambahkan mesin yang lebih bertenaga ke mobil yang sudah ada. Kelompok 6 seperti menambahkan mode offroad ke mobil yang sebelumnya hanya bisa berjalan di jalan aspal — kapabilitasnya bertambah secara fundamental, bukan sekadar meningkat secara inkremental.

Implikasi praktisnya adalah setiap fitur di kelompok ini memerlukan **pemahaman domain bisnis yang mendalam** dari tim pengembang sebelum baris kode pertama ditulis. Modul KPI Tracking misalnya memerlukan pemahaman tentang bagaimana ASABRI mendefinisikan dan mengukur KPI. Meeting Management memerlukan pemahaman tentang alur notulen dan tindak lanjut yang berlaku di perusahaan. e-Signature memerlukan koordinasi dengan tim Legal dan IT Security karena menyentuh aspek kepatuhan hukum.

---

## Daftar Isi

1. [Fitur 6.1 — Modul KPI Tracking](#fitur-61--modul-kpi-tracking)
2. [Fitur 6.2 — Meeting Management & Action Items](#fitur-62--meeting-management--action-items)
3. [Fitur 6.3 — e-Signature untuk Dokumen Persetujuan](#fitur-63--e-signature-untuk-dokumen-persetujuan)
4. [Urutan Implementasi yang Disarankan](#urutan-implementasi-yang-disarankan)

---

## Fitur 6.1 — Modul KPI Tracking

### Latar Belakang & Nilai Bisnis

BRS aplikasi ROCKET secara eksplisit menyebutkan "target KPI" sebagai salah satu dimensi pekerjaan yang ingin dipantau. Namun implementasi yang ada saat ini hanya menyentuh level project — ia menjawab pertanyaan "apakah pekerjaan ini selesai?" tetapi tidak menjawab pertanyaan yang lebih strategis: "apakah pencapaian pekerjaan-pekerjaan ini berkontribusi pada target organisasi yang lebih besar?"

Perbedaan antara project dan KPI perlu dipahami dengan jelas agar arsitektur modul ini dirancang dengan tepat. Sebuah KPI adalah **target bisnis yang terukur** — misalnya "Coverage media positif ASABRI ≥ 80% dari total pemberitaan" atau "Tingkat respons terhadap permintaan protokol ≤ 2 hari kerja." KPI ini tidak dicapai melalui satu project tunggal, melainkan melalui **akumulasi banyak project** yang masing-masing berkontribusi pada pencapaian tersebut.

Modul KPI Tracking menciptakan lapisan baru di atas Working Tracker — bukan menggantikannya, melainkan memberikan makna strategis pada pekerjaan-pekerjaan yang sudah tercatat di dalamnya.

### Perubahan Database

Arsitektur database untuk modul ini dirancang dengan mempertimbangkan fleksibilitas pengukuran. KPI bisa diukur dalam berbagai cara — ada yang diukur sebagai persentase, ada yang diukur sebagai hitungan (jumlah event yang berhasil dilaksanakan), dan ada yang diukur sebagai durasi waktu.

```prisma
model KpiTarget {
  id           String   @id @default(uuid())
  name         String   // Nama KPI, contoh: "Coverage Media Positif"
  description  String?  @db.Text
  period_year  Int      // Tahun target ini berlaku
  period_type  KpiPeriodType // Apakah target ini tahunan, per semester, atau per kuartal?

  target_value  Float   // Nilai target yang ingin dicapai
  current_value Float   @default(0) // Nilai pencapaian saat ini (di-update otomatis)
  unit          String  // Satuan: "%", "event", "hari", "publikasi", dll

  // Apakah nilai yang lebih tinggi berarti lebih baik (true)
  // atau lebih rendah berarti lebih baik (false)?
  // Contoh: "Coverage positif" → higher_is_better = true
  // Contoh: "Waktu respons" → higher_is_better = false
  higher_is_better Boolean @default(true)

  // Metode kalkulasi pencapaian — bagaimana current_value dihitung?
  calc_method  KpiCalcMethod

  is_active    Boolean  @default(true)
  created_by_id String
  created_by   User     @relation(fields: [created_by_id], references: [id])
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  // Project-project yang berkontribusi pada KPI ini
  project_links KpiProjectLink[]

  // Catatan progres manual yang bisa diinput oleh Kabid
  progress_notes KpiProgressNote[]

  @@map("kpi_targets")
}

enum KpiPeriodType {
  ANNUAL      // Target tahunan
  SEMESTER    // Target per 6 bulan
  QUARTERLY   // Target per kuartal
}

enum KpiCalcMethod {
  AUTO_COUNT_FINISHED  // Otomatis: hitung project linked yang berstatus FINISHED
  AUTO_PERCENTAGE      // Otomatis: persentase project linked yang selesai tepat waktu
  MANUAL               // Manual: Kabid menginput nilai pencapaian secara berkala
}

// Tabel pivot yang menghubungkan project ke KPI
// Satu project bisa berkontribusi ke lebih dari satu KPI
// Satu KPI bisa dicapai melalui banyak project
model KpiProjectLink {
  id         String    @id @default(uuid())
  kpi_id     String
  kpi        KpiTarget @relation(fields: [kpi_id], references: [id])
  project_id String
  project    Project   @relation(fields: [project_id], references: [id])

  // Bobot kontribusi project ini terhadap KPI (0.0 - 1.0)
  // Jika null, semua project berkontribusi sama rata
  weight     Float?

  linked_by_id String
  linked_by    User   @relation(fields: [linked_by_id], references: [id])
  linked_at    DateTime @default(now())

  @@unique([kpi_id, project_id])
  @@map("kpi_project_links")
}

// Catatan progres manual untuk KPI dengan calc_method = MANUAL
model KpiProgressNote {
  id        String    @id @default(uuid())
  kpi_id    String
  kpi       KpiTarget @relation(fields: [kpi_id], references: [id])

  value     Float     // Nilai pencapaian saat catatan ini dibuat
  note      String    @db.Text  // Penjelasan dari Kabid
  noted_at  DateTime  @default(now())
  noted_by_id String
  noted_by  User      @relation(fields: [noted_by_id], references: [id])

  @@map("kpi_progress_notes")
}
```

Tambahkan relasi balik di model `Project`:

```prisma
// Di model Project:
kpi_links KpiProjectLink[]
```

### Perubahan Backend

Modul KPI terdiri dari dua aspek yang berbeda: manajemen target (CRUD) dan kalkulasi pencapaian. Kalkulasi adalah bagian yang paling menarik secara teknis karena harus menangani tiga metode berbeda.

```typescript
// kpi.service.ts

@Injectable()
export class KpiService {
  constructor(private prisma: PrismaService) {}

  // Kalkulasi pencapaian KPI secara real-time berdasarkan metode yang dipilih
  async calculateAchievement(kpiId: string): Promise<number> {
    const kpi = await this.prisma.kpiTarget.findUniqueOrThrow({
      where  : { id: kpiId },
      include: { project_links: { include: { project: true } } }
    });

    switch (kpi.calc_method) {

      case KpiCalcMethod.AUTO_COUNT_FINISHED: {
        // Hitung berapa project linked yang sudah berstatus FINISHED
        const finishedCount = kpi.project_links
          .filter(link => link.project.status === ProjectStatus.FINISHED)
          .length;
        return finishedCount;
      }

      case KpiCalcMethod.AUTO_PERCENTAGE: {
        // Persentase project yang selesai tepat waktu (sebelum due_date)
        const linkedProjects = kpi.project_links.map(l => l.project);
        if (linkedProjects.length === 0) return 0;

        const onTimeCount = linkedProjects.filter(p =>
          p.status === ProjectStatus.FINISHED &&
          new Date(p.updated_at) <= new Date(p.due_date)
        ).length;

        return (onTimeCount / linkedProjects.length) * 100;
      }

      case KpiCalcMethod.MANUAL: {
        // Ambil nilai terkini dari progress notes
        const latestNote = await this.prisma.kpiProgressNote.findFirst({
          where  : { kpi_id: kpiId },
          orderBy: { noted_at: 'desc' }
        });
        return latestNote?.value ?? 0;
      }

      default: return 0;
    }
  }

  // Update current_value semua KPI secara batch — dipanggil oleh scheduler
  async refreshAllKpiValues() {
    const allKpis = await this.prisma.kpiTarget.findMany({
      where: { is_active: true }
    });

    for (const kpi of allKpis) {
      const currentValue = await this.calculateAchievement(kpi.id);
      await this.prisma.kpiTarget.update({
        where: { id: kpi.id },
        data : { current_value: currentValue }
      });
    }
  }

  // Hitung persentase pencapaian — normalisasi ke 0-100% apapun satuannya
  getAchievementPercentage(kpi: KpiTarget): number {
    if (kpi.target_value === 0) return 0;
    const raw = (kpi.current_value / kpi.target_value) * 100;
    return Math.min(Math.round(raw), 100); // Cap di 100%
  }
}
```

Tambahkan cron job di scheduler untuk menyegarkan nilai KPI setiap hari:

```typescript
// Di scheduler.service.ts:
@Cron('0 3 * * *') // Jam 03.00 dini hari, setelah risk score calculation selesai
async refreshKpiValues() {
  await this.kpiService.refreshAllKpiValues();
}
```

### Perubahan Frontend

Modul KPI memerlukan dua tempat di frontend. Pertama, halaman `KpiPage.tsx` yang bisa diakses dari menu navigasi, menampilkan semua KPI dalam bentuk kartu dengan progress bar yang menunjukkan persentase pencapaian terhadap target. Kartu ini menggunakan kode warna yang konsisten: hijau untuk ≥80%, kuning untuk 50-79%, dan merah untuk <50% dari target.

Kedua, integrasi di Dashboard utama — tambahkan widget "Pencapaian KPI" yang menampilkan ringkasan 3 KPI terpenting dengan gauge visual. Ini memberikan visibilitas KPI kepada semua pengguna tanpa harus membuka halaman KPI secara terpisah.

---

## Fitur 6.2 — Meeting Management & Action Items

### Latar Belakang & Nilai Bisnis

Ada sebuah masalah yang hampir universal di organisasi manapun: rapat menghasilkan keputusan dan komitmen, tetapi tindak lanjut dari keputusan tersebut seringkali terputus dari sistem yang digunakan untuk mengelola pekerjaan. Notulen ditulis di Word, dikirim lewat email, dan kemudian hilang di kotak masuk yang penuh. Akibatnya, dua minggu setelah rapat, pertanyaan "apakah action item dari rapat itu sudah dikerjakan?" tidak bisa dijawab dengan cepat dan akurat.

Modul Meeting Management menjembatani kesenjangan ini dengan cara yang elegan: ia tidak mencoba menjadi aplikasi notulen yang lengkap (yang sudah banyak tersedia), melainkan fokus pada satu fungsi spesifik — **mengubah keputusan rapat menjadi project yang terlacak di Working Tracker**. Setiap action item dari rapat bisa langsung di-assign ke Staff sebagai project baru dengan satu klik, menciptakan rantai akuntabilitas yang tidak putus dari keputusan sampai penyelesaian.

### Perubahan Database

```prisma
model Meeting {
  id            String   @id @default(uuid())
  title         String   // Judul rapat, contoh: "Rapat Evaluasi Kinerja Q1 2025"
  meeting_date  DateTime
  location      String?  // Ruang rapat atau platform (Zoom, Teams, dll)
  attendees     String[] // Array nama peserta — disimpan sebagai teks untuk fleksibilitas

  // Ringkasan dan notulen singkat
  summary       String?  @db.Text
  minutes_url   String?  // Link ke notulen lengkap di SharePoint jika ada

  created_by_id String
  created_by    User     @relation(fields: [created_by_id], references: [id])
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  // Action items yang dihasilkan dari rapat ini
  action_items  ActionItem[]

  @@map("meetings")
}

model ActionItem {
  id          String  @id @default(uuid())
  meeting_id  String
  meeting     Meeting @relation(fields: [meeting_id], references: [id], onDelete: Cascade)

  description String  @db.Text  // Deskripsi tindakan yang perlu dilakukan
  due_date    DateTime

  // PIC yang bertanggung jawab atas action item ini
  assignee_id String
  assignee    User    @relation("ActionItemAssignee", fields: [assignee_id], references: [id])

  // Status action item ini
  status      ActionItemStatus @default(OPEN)

  // Jika action item ini sudah dikonversi menjadi project di Working Tracker,
  // simpan referensinya di sini untuk menghindari duplikasi
  converted_project_id String? @unique
  converted_project    Project? @relation(fields: [converted_project_id], references: [id])

  // Kapan dikonversi ke project
  converted_at  DateTime?
  converted_by_id String?
  converted_by  User?   @relation("ActionItemConverter", fields: [converted_by_id], references: [id])

  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@map("action_items")
}

enum ActionItemStatus {
  OPEN        // Belum ditindaklanjuti
  IN_PROGRESS // Sudah dikonversi ke project dan sedang dikerjakan
  DONE        // Selesai (baik via project maupun langsung)
  CANCELLED   // Dibatalkan
}
```

Tambahkan relasi di model `Project` dan `User`:

```prisma
// Di model Project:
source_action_item ActionItem?   // Jika project ini berasal dari action item rapat

// Di model User:
action_items_assigned  ActionItem[] @relation("ActionItemAssignee")
action_items_converted ActionItem[] @relation("ActionItemConverter")
meetings_created       Meeting[]
```

### Perubahan Backend

```typescript
// meetings.service.ts

@Injectable()
export class MeetingsService {
  constructor(
    private prisma           : PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateMeetingDto, creatorId: string) {
    const meeting = await this.prisma.meeting.create({
      data: {
        title        : dto.title,
        meeting_date : new Date(dto.meeting_date),
        location     : dto.location,
        attendees    : dto.attendees,
        summary      : dto.summary,
        minutes_url  : dto.minutes_url,
        created_by_id: creatorId,
        action_items : {
          // Buat semua action items sekaligus dalam satu query
          create: dto.action_items?.map(item => ({
            description : item.description,
            due_date    : new Date(item.due_date),
            assignee_id : item.assignee_id,
            status      : ActionItemStatus.OPEN,
          })) ?? []
        }
      },
      include: {
        action_items: { include: { assignee: { select: { email: true, full_name: true } } } }
      }
    });

    // Kirim notifikasi ke setiap assignee action item
    for (const item of meeting.action_items) {
      await this.notificationsService.create({
        user_id   : item.assignee_id,
        type      : NotificationType.ACTION_ITEM_ASSIGNED,
        title     : 'Action Item Baru dari Rapat',
        message   : `Anda mendapat action item dari rapat "${meeting.title}": ${item.description}`,
        project_id: null,
      });
    }

    return meeting;
  }

  // Konversi action item menjadi project di Working Tracker
  // Ini adalah operasi yang paling penting di modul ini
  async convertToProject(actionItemId: string, dto: ConvertToProjectDto, userId: string) {
    const actionItem = await this.prisma.actionItem.findUniqueOrThrow({
      where  : { id: actionItemId },
      include: { meeting: true }
    });

    // Validasi: action item tidak boleh sudah pernah dikonversi sebelumnya
    if (actionItem.converted_project_id) {
      throw new BadRequestException('Action item ini sudah pernah dikonversi ke project.');
    }

    // Jalankan dalam transaction untuk memastikan konsistensi
    return this.prisma.$transaction(async (tx) => {
      // Buat project baru di Working Tracker
      const project = await tx.project.create({
        data: {
          name        : dto.project_name || actionItem.description,
          due_date    : new Date(actionItem.due_date),
          status      : ProjectStatus.TO_DO_NEXT,
          month       : new Date(actionItem.due_date).getMonth() + 1,
          year        : new Date(actionItem.due_date).getFullYear(),
          pic_user_id : actionItem.assignee_id,
          keterangan  : `Berasal dari action item rapat: ${actionItem.meeting.title} (${format(actionItem.meeting.meeting_date, 'dd MMMM yyyy', { locale: id })})`,
        }
      });

      // Update action item: tandai sudah dikonversi
      await tx.actionItem.update({
        where: { id: actionItemId },
        data : {
          status               : ActionItemStatus.IN_PROGRESS,
          converted_project_id : project.id,
          converted_at         : new Date(),
          converted_by_id      : userId,
        }
      });

      return project;
    });
  }
}
```

Tambahkan enum notifikasi baru:

```prisma
// Di enum NotificationType:
ACTION_ITEM_ASSIGNED // Pengguna mendapat action item baru dari rapat
```

### Perubahan Frontend

Halaman `MeetingPage.tsx` menampilkan daftar rapat dalam urutan terbaru. Setiap rapat bisa di-klik untuk membuka detail yang menampilkan daftar action items beserta status masing-masing. Di sebelah setiap action item yang masih berstatus `OPEN`, terdapat tombol "Jadikan Project" yang membuka modal konfirmasi singkat — pengguna bisa mengubah nama project jika perlu, atau langsung mengonfirmasi dengan nama default dari deskripsi action item.

Yang membuat UI ini sangat intuitif adalah indikator visual yang jelas: action item yang sudah dikonversi ke project menampilkan chip berwarna biru bertuliskan nama project terkait (yang bisa diklik langsung ke halaman detail project tersebut), sementara yang belum menampilkan chip abu-abu bertuliskan "Belum ada project."

---

## Fitur 6.3 — e-Signature untuk Dokumen Persetujuan

### Latar Belakang & Nilai Bisnis

Ketika Kabid atau Sesper menekan tombol "Setujui" di halaman Review, sebuah keputusan penting telah dibuat. Namun saat ini, keputusan itu hanya tersimpan sebagai record di database — tidak ada artefak yang bisa dicetak, dibagikan, atau dijadikan bukti formal. Dalam konteks BUMN yang memiliki kewajiban audit dan compliance yang ketat, ketiadaan dokumen persetujuan formal ini adalah celah yang perlu ditutup.

e-Signature mengisi celah ini. Ketika approval dilakukan di sistem, ROCKET otomatis menghasilkan dokumen PDF persetujuan yang mencantumkan detail project, tanggal persetujuan, dan tanda tangan elektronik dari approver. Dokumen ini tersimpan sebagai bagian dari histori project dan bisa diunduh kapanpun sebagai bukti formal.

Pendekatan implementasi yang dipilih menggunakan dua opsi tergantung pada infrastruktur yang tersedia di ASABRI. Opsi pertama dan lebih sederhana adalah **tanda tangan berbasis gambar** — sistem menyimpan gambar tanda tangan digital setiap approver (diunggah sekali saat setup), dan menyematkannya ke dalam PDF persetujuan yang di-generate. Ini bukan tanda tangan kriptografis, tetapi cukup untuk banyak keperluan dokumentasi internal. Opsi kedua yang lebih kuat adalah **integrasi dengan BSRE** (Balai Sertifikasi Elektronik) milik BSSN, yang menghasilkan tanda tangan elektronik yang diakui secara hukum di Indonesia berdasarkan UU ITE.

### Perubahan Database

```prisma
// Penyimpanan gambar tanda tangan digital setiap user (untuk opsi 1)
model UserSignature {
  id           String   @id @default(uuid())
  user_id      String   @unique
  user         User     @relation(fields: [user_id], references: [id])
  signature_path String  // Path ke file gambar tanda tangan (PNG transparan)
  is_active    Boolean  @default(true)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@map("user_signatures")
}

// Dokumen persetujuan yang dihasilkan dari proses review
model ApprovalDocument {
  id           String        @id @default(uuid())
  review_id    String        @unique  // Satu review menghasilkan satu dokumen
  review       ProjectReview @relation(fields: [review_id], references: [id])

  document_path String      // Path ke file PDF yang dihasilkan
  signed_by_id  String
  signed_by     User        @relation(fields: [signed_by_id], references: [id])
  signed_at     DateTime    @default(now())

  // Untuk opsi BSRE: menyimpan token verifikasi dari BSRE
  bsre_token    String?
  bsre_verified Boolean @default(false)

  @@map("approval_documents")
}
```

### Perubahan Backend

Tambahkan method `generateApprovalDocument` di `ReviewService` yang dipanggil otomatis setiap kali approval diproses:

```typescript
// Di review.service.ts — modifikasi method approve yang sudah ada

async approve(reviewId: string, approverId: string) {
  // ... logika approval yang sudah ada ...

  // Setelah approval berhasil, generate dokumen PDF secara async
  // (tidak perlu menunggu — jalankan di background)
  this.generateApprovalDocument(review, approver).catch(err =>
    this.logger.error(`Gagal generate approval document: ${err.message}`)
  );

  return updatedReview;
}

private async generateApprovalDocument(review: any, approver: User) {
  // Ambil gambar tanda tangan approver
  const signature = await this.prisma.userSignature.findUnique({
    where: { user_id: approver.id }
  });

  // Data yang akan disematkan ke dokumen PDF
  const documentData = {
    project        : review.project,
    approved_by    : approver,
    approved_at    : new Date(),
    review_stage   : review.review_stage,
    signature_path : signature?.signature_path ?? null,
    document_number: this.generateDocumentNumber(), // Format: ROCKET/APP/2025/001
  };

  // Generate PDF menggunakan Puppeteer dengan template HTML
  const html = await this.compileApprovalTemplate(documentData);
  const pdfBuffer = await this.exportService.htmlToPdf(html, {
    format    : 'A4',
    printBackground: true,
  });

  // Simpan file dan buat record di database
  const filePath = await this.storageService.save(
    { buffer: pdfBuffer, originalname: `approval-${review.id}.pdf`, mimetype: 'application/pdf' } as any,
    'approvals'
  );

  await this.prisma.approvalDocument.create({
    data: {
      review_id    : review.id,
      document_path: filePath,
      signed_by_id : approver.id,
    }
  });
}
```

Template HTML untuk dokumen persetujuan `approval-document.hbs` perlu dirancang dengan tampilan yang profesional dan sesuai dengan identitas visual ASABRI — menggunakan logo, warna biru dan emas, dan format yang mirip dengan dokumen resmi perusahaan pada umumnya.

### Perubahan Frontend

Di halaman `ProjectDetailPage`, tab "Aktivitas" sekarang menampilkan link unduh untuk setiap dokumen persetujuan yang pernah dihasilkan. Tambahkan juga halaman manajemen tanda tangan di `ProfilePage` — setiap user Level 2 ke atas bisa mengupload gambar tanda tangan digitalnya dengan panduan yang jelas tentang format yang diharapkan (PNG transparan, ukuran minimal 200x80 pixel, hanya tanda tangan tanpa background).

---

## Urutan Implementasi yang Disarankan

Koordinasi dengan stakeholder non-teknis sangat kritis untuk kelompok ini, lebih dari kelompok manapun sebelumnya. **Modul KPI** harus dimulai dengan sesi diskusi bersama Kabid untuk mendefinisikan KPI apa saja yang ingin diukur dan bagaimana cara pengukurannya — karena tanpa definisi yang jelas, sistem yang dibangun bisa jadi tidak relevan dengan kebutuhan aktual.

**Meeting Management** bisa dikerjakan secara paralel dengan KPI karena tidak ada dependensi di antara keduanya. Modul ini relatif lebih mudah untuk mendapatkan buy-in dari pengguna karena manfaatnya sangat langsung dan konkret — hampir semua orang di tim pernah merasakan frustrasi akibat action item rapat yang tidak terlacak.

**e-Signature** harus dikerjakan terakhir karena memerlukan koordinasi dengan tim Legal dan IT Security ASABRI. Perlu ada kesepakatan tentang apakah tanda tangan berbasis gambar sudah cukup untuk keperluan dokumentasi internal, atau apakah diperlukan integrasi BSRE yang lebih kompleks. Rekomendasi saya adalah mulai dengan opsi gambar tanda tangan untuk mendapatkan nilai segera, kemudian upgrade ke BSRE jika ada kebutuhan compliance yang lebih ketat.
