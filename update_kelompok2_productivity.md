# 📅 Update Kelompok 2 — Fitur Produktivitas
### Aplikasi ROCKET | PT ASABRI (Persero)
> **Prioritas:** Tinggi — Medium Term (setelah Kelompok 1 selesai)
> **Estimasi Total:** 4–6 minggu pengerjaan
> **Dampak:** Mengubah cara tim merencanakan dan mendelegasikan pekerjaan

---

## Mengapa Kelompok Ini Penting

Kelompok 2 berbeda dari Quick Win dalam satu hal fundamental: fitur-fitur di sini **mengubah perilaku kerja tim**, bukan hanya menambah kenyamanan. Kalender terintegrasi mengubah cara tim melihat dan merencanakan workload. Template project mengubah cara tim memulai pekerjaan baru. Laporan otomatis mengubah cara manajemen mengonsumsi informasi. Inilah yang dimaksud dengan "productivity features" — fitur yang membuat tim bekerja lebih cepat dan lebih cerdas, bukan hanya bekerja dengan tools yang lebih nyaman.

Syarat utama sebelum kelompok ini dikerjakan adalah Kelompok 1 sudah berjalan stabil selama beberapa minggu, dan data project di database sudah cukup untuk membuat kalender dan laporan terasa bermakna.

---

## Daftar Isi

1. [Fitur 2.1 — Kalender Terintegrasi dengan Drag-and-Drop Rescheduling](#fitur-21--kalender-terintegrasi-dengan-drag-and-drop-rescheduling)
2. [Fitur 2.2 — Template Project](#fitur-22--template-project)
3. [Fitur 2.3 — Laporan Kinerja Otomatis](#fitur-23--laporan-kinerja-otomatis)
4. [Urutan Implementasi yang Disarankan](#urutan-implementasi-yang-disarankan)

---

## Fitur 2.1 — Kalender Terintegrasi dengan Drag-and-Drop Rescheduling

### Latar Belakang & Nilai Bisnis

Tabel Working Tracker sangat baik untuk mengelola data — mencari, mengurutkan, memfilter. Namun ada satu hal yang tabel tidak bisa lakukan dengan baik: **memvisualisasikan distribusi beban kerja sepanjang waktu**. Ketika ada 40 project aktif, tabel membutuhkan scrolling dan filtering untuk memahami "minggu mana yang paling padat". Kalender menjawab pertanyaan ini dalam hitungan detik — Anda melihat sekilas bahwa minggu pertama bulan Mei ada 12 project yang jatuh tempo, sementara minggu keduanya kosong.

Fitur yang paling membedakan kalender ROCKET dari sekadar tampilan adalah **drag-and-drop rescheduling**. Kabid yang melihat penumpukan project di satu minggu bisa langsung menggeser kartu project ke minggu yang lebih longgar — sistem secara otomatis mengubah due date dan status menjadi `RESCHEDULED`, mengirim notifikasi ke PIC, dan mencatat perubahan di Activity Log.

### Perubahan Database

Kalender tidak memerlukan tabel baru karena semua data yang dibutuhkan sudah ada di tabel `projects`. Yang diperlukan hanyalah endpoint API baru yang mengembalikan project dalam format yang ramah untuk library kalender.

Namun ada satu tambahan kecil di tabel `projects` untuk mendukung visualisasi yang lebih baik. Tambahkan kolom `color_tag` yang memungkinkan Kabid memberi kode warna berbeda pada kategori project yang berbeda:

```prisma
// Tambahkan di model Project:
color_tag String? @default("#0D2B6B")  // Default warna biru ASABRI
```

### Perubahan Backend

Tambahkan endpoint baru di `projects.controller.ts` khusus untuk kebutuhan kalender:

```typescript
// Endpoint ini mengembalikan project dalam format yang dioptimalkan untuk kalender.
// Parameter query: year (wajib), month (opsional — jika tidak diisi, kembalikan satu tahun)
@Get('calendar')
getCalendarView(
  @Query('year') year: number,
  @Query('month') month?: number,
  @CurrentUser() user: User
) {
  return this.projectsService.getCalendarView(year, month, user);
}

// Endpoint khusus untuk drag-and-drop rescheduling.
// Ini adalah PATCH yang hanya mengubah due_date dan status, bukan update umum.
// Dipisahkan agar kontrol akses bisa lebih spesifik (hanya Level 2 ke atas).
@Patch(':id/reschedule')
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
rescheduleProject(
  @Param('id') id: string,
  @Body() dto: RescheduleProjectDto,
  @CurrentUser() user: User
) {
  return this.projectsService.reschedule(id, dto, user);
}
```

Implementasi `getCalendarView` di service perlu mengembalikan format yang sesuai dengan kebutuhan FullCalendar:

```typescript
// projects.service.ts — tambahkan method ini

async getCalendarView(year: number, month?: number, user: User) {
  // Tentukan rentang tanggal berdasarkan parameter
  const startDate = month
    ? startOfMonth(new Date(year, month - 1))
    : startOfYear(new Date(year, 0));
  const endDate = month
    ? endOfMonth(new Date(year, month - 1))
    : endOfYear(new Date(year, 0));

  const whereClause: any = {
    deleted_at : null,
    due_date   : { gte: startDate, lte: endDate },
    status     : { notIn: ['CANCELLED'] },
  };

  // Staff hanya melihat project miliknya sendiri di kalender
  if (user.role === UserRole.LEVEL_3) {
    whereClause.pic_user_id = user.id;
  }

  const projects = await this.prisma.project.findMany({
    where  : whereClause,
    include: {
      pic: { select: { full_name: true } },
      sub_projects: { select: { name: true, due_date: true } }
    },
  });

  // Format untuk FullCalendar — setiap event memiliki id, title, start, end, color
  return projects.map(p => ({
    id       : p.id,
    title    : p.name,
    start    : p.due_date.toISOString().split('T')[0], // Format YYYY-MM-DD
    end      : p.due_date.toISOString().split('T')[0],
    color    : p.color_tag || this.getStatusColor(p.status),
    extendedProps: {
      status    : p.status,
      pic_name  : p.pic.full_name,
      client    : p.client,
      sub_count : p.sub_projects.length,
    }
  }));
}

// Mapping status ke warna secara konsisten dengan StatusBadge di frontend
private getStatusColor(status: ProjectStatus): string {
  const colorMap = {
    FINISHED       : '#52c41a', // Hijau
    ON_GOING       : '#1677ff', // Biru
    TO_DO_NEXT     : '#8c8c8c', // Abu-abu
    NEED_FOLLOW_UP : '#fa8c16', // Oranye
    CANCELLED      : '#ff4d4f', // Merah
    RESCHEDULED    : '#722ed1', // Ungu
    REVISI         : '#eb2f96', // Pink
  };
  return colorMap[status] || '#0D2B6B';
}

async reschedule(id: string, dto: RescheduleProjectDto, user: User) {
  const project = await this.prisma.project.findUniqueOrThrow({
    where: { id, deleted_at: null }
  });

  return this.prisma.project.update({
    where: { id },
    data : {
      due_date: new Date(dto.new_due_date),
      status  : ProjectStatus.RESCHEDULED,
    }
  });
  // Activity Log otomatis tercatat via Prisma Middleware dari Kelompok 1
  // Notifikasi ke PIC otomatis dikirim via NotificationsService
}
```

DTO untuk rescheduling:

```typescript
// reschedule-project.dto.ts
import { IsDateString } from 'class-validator';

export class RescheduleProjectDto {
  @IsDateString()
  new_due_date: string;  // Format: "2025-06-15"
}
```

### Perubahan Frontend

Install library kalender yang dibutuhkan:

```bash
cd apps/frontend

# FullCalendar dengan dukungan React, view bulanan, dan interaksi drag-drop
npm install @fullcalendar/react @fullcalendar/core
npm install @fullcalendar/daygrid     # Tampilan bulan (grid kalender biasa)
npm install @fullcalendar/timegrid    # Tampilan minggu dengan jam
npm install @fullcalendar/interaction # Fitur drag-drop dan click
```

Buat halaman baru `CalendarPage.tsx` di `src/pages/Calendar/`:

```tsx
// CalendarPage.tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const CalendarPage = () => {
  const [selectedYear] = useState(new Date().getFullYear());
  const { events, reschedule } = useCalendar(selectedYear);

  const handleEventDrop = async (info) => {
    // info.event.id = project ID
    // info.event.startStr = tanggal baru setelah di-drop

    // Tampilkan konfirmasi sebelum benar-benar menyimpan
    const confirmed = await showConfirmModal(
      `Pindahkan deadline "${info.event.title}" ke ${formatDate(info.event.startStr)}?`
    );

    if (confirmed) {
      await reschedule(info.event.id, info.event.startStr);
    } else {
      // Kembalikan event ke posisi semula jika dibatalkan
      info.revert();
    }
  };

  const handleEventClick = (info) => {
    // Klik event membuka popover dengan detail singkat project
    // dan tombol "Buka Detail" untuk ke ProjectDetailPage
    openProjectPopover(info.event.id);
  };

  return (
    <PageWrapper title="Kalender Pekerjaan">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="id"                // Bahasa Indonesia
        events={events}
        editable={canReschedule}   // Hanya Level 2 ke atas yang bisa drag-drop
        droppable={canReschedule}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        headerToolbar={{
          left  : 'prev,next today',
          center: 'title',
          right : 'dayGridMonth,timeGridWeek'
        }}
        buttonText={{
          today : 'Hari Ini',
          month : 'Bulan',
          week  : 'Minggu',
        }}
        eventContent={(eventInfo) => (
          // Custom render kartu event dengan PIC dan status badge
          <ProjectEventCard event={eventInfo.event} />
        )}
      />
    </PageWrapper>
  );
};
```

Tambahkan route baru di `router/index.tsx`:
```typescript
{ path: '/calendar', element: <CalendarPage /> }
```

Dan tambahkan item menu "Kalender" di `Sidebar.tsx` dengan ikon kalender dari Ant Design Icons.

---

## Fitur 2.2 — Template Project

### Latar Belakang & Nilai Bisnis

Dalam satu tahun, tim Kompro ASABRI menjalankan banyak kegiatan yang berulang dengan struktur yang mirip-mirip. Kunjungan direksi selalu memerlukan sub-project yang hampir sama: koordinasi protokoler, persiapan media release, dokumentasi foto, dan distribusi siaran pers. Tanpa fitur template, Staff harus membuat semua sub-project ini dari nol setiap kali ada kunjungan baru — pekerjaan repetitif yang memakan waktu dan rentan terlewat.

Template project menyelesaikan ini dengan sekali setup. Setelah struktur project kunjungan direksi disimpan sebagai template, pembuatan project serupa berikutnya hanya memerlukan beberapa klik untuk memilih template dan menyesuaikan tanggal.

### Perubahan Database

Tambahkan dua tabel baru untuk menyimpan template dan sub-template-nya:

```prisma
model ProjectTemplate {
  id          String   @id @default(uuid())
  name        String   // Nama template, contoh: "Kunjungan Direksi"
  description String?  // Penjelasan singkat kapan template ini digunakan
  is_active   Boolean  @default(true)

  // Siapa yang membuat template ini (hanya bisa dibuat oleh Level 2 ke atas)
  created_by_id String
  created_by    User   @relation("TemplateCreator", fields: [created_by_id], references: [id])

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Daftar sub-project yang akan dibuat otomatis dari template ini
  sub_templates SubProjectTemplate[]

  @@map("project_templates")
}

model SubProjectTemplate {
  id           String          @id @default(uuid())
  template_id  String
  template     ProjectTemplate @relation(fields: [template_id], references: [id], onDelete: Cascade)

  name         String          // Nama sub-project template
  // Offset hari dari due date project induk.
  // Contoh: -7 berarti sub-project ini due 7 hari sebelum project induk.
  // Ini memudahkan penyesuaian otomatis saat due date project diubah.
  day_offset   Int @default(0)
  keterangan   String?

  @@map("sub_project_templates")
}
```

Tambahkan relasi di model `User`:
```prisma
// Di model User:
templates_created ProjectTemplate[] @relation("TemplateCreator")
```

### Perubahan Backend

Buat modul baru `project-templates` dengan controller dan service-nya:

```typescript
// project-templates.controller.ts

@Controller('project-templates')
@UseGuards(JwtAuthGuard)
export class ProjectTemplatesController {

  @Get()                     // Semua user bisa lihat daftar template
  findAll() { ... }

  @Get(':id')                // Detail template beserta sub-template-nya
  findOne(@Param('id') id: string) { ... }

  @Post()                    // Hanya Level 2 ke atas bisa buat template baru
  @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: User) { ... }

  @Patch(':id')
  @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) { ... }

  @Delete(':id')
  @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
  remove(@Param('id') id: string) { ... }
}
```

Method terpenting di service adalah `applyTemplate` — dipanggil ketika user memilih template saat membuat project baru:

```typescript
// project-templates.service.ts

async applyTemplate(templateId: string, projectData: CreateProjectDto) {
  const template = await this.prisma.projectTemplate.findUniqueOrThrow({
    where  : { id: templateId },
    include: { sub_templates: true }
  });

  // Buat project utama terlebih dahulu
  const project = await this.prisma.project.create({
    data: {
      name      : projectData.name,
      due_date  : new Date(projectData.due_date),
      status    : ProjectStatus.TO_DO_NEXT,
      month     : new Date(projectData.due_date).getMonth() + 1,
      year      : new Date(projectData.due_date).getFullYear(),
      pic_user_id: projectData.pic_user_id,
      client    : projectData.client,
      keterangan: `Dibuat dari template: ${template.name}`,
    }
  });

  // Buat sub-project untuk setiap sub-template,
  // dengan due date dihitung berdasarkan day_offset dari due date project
  const dueDate = new Date(projectData.due_date);
  const subProjectPromises = template.sub_templates.map(sub =>
    this.prisma.subProject.create({
      data: {
        project_id  : project.id,
        name        : sub.name,
        keterangan  : sub.keterangan,
        pic_user_id : projectData.pic_user_id,  // Default PIC sama dengan project induk
        due_date    : addDays(dueDate, sub.day_offset),
        status      : ProjectStatus.TO_DO_NEXT,
      }
    })
  );

  await Promise.all(subProjectPromises);
  return project;
}
```

Modifikasi `projects.controller.ts` untuk mendukung pembuatan project dari template:

```typescript
// Tambahkan endpoint ini di projects.controller.ts
@Post('from-template/:templateId')
createFromTemplate(
  @Param('templateId') templateId: string,
  @Body() dto: CreateProjectDto,
  @CurrentUser() user: User
) {
  return this.projectTemplatesService.applyTemplate(templateId, dto);
}
```

### Perubahan Frontend

Modifikasi `ProjectFormPage.tsx` untuk menambahkan opsi "Buat dari Template" di bagian atas form. Ketika pengguna memilih template dari dropdown, sub-project section di form langsung terisi secara otomatis:

```tsx
// Di ProjectFormPage.tsx — tambahkan section ini di bagian atas form

const [selectedTemplate, setSelectedTemplate] = useState(null);
const { templates } = useProjectTemplates();

const handleTemplateSelect = (templateId: string) => {
  const template = templates.find(t => t.id === templateId);
  if (!template) return;

  setSelectedTemplate(template);

  // Pre-fill sub-project fields dari template
  // sub_templates dari template otomatis jadi nilai awal di form
  setValue('sub_projects', template.sub_templates.map(sub => ({
    name      : sub.name,
    day_offset: sub.day_offset,  // Akan dikonversi ke tanggal saat submit
    keterangan: sub.keterangan,
  })));
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    {/* Section pemilihan template — tampil di atas semua field lain */}
    <Card title="Gunakan Template (Opsional)" className="mb-4">
      <div className="flex gap-3 items-center">
        <Select
          placeholder="Pilih template project..."
          options={templates.map(t => ({ value: t.id, label: t.name }))}
          onChange={handleTemplateSelect}
          className="flex-1"
          allowClear
        />
        {selectedTemplate && (
          <Tag color="blue">
            {selectedTemplate.sub_templates.length} sub-project akan dibuat otomatis
          </Tag>
        )}
      </div>
      {selectedTemplate?.description && (
        <p className="text-sm text-gray-500 mt-2">{selectedTemplate.description}</p>
      )}
    </Card>

    {/* Field-field form yang sudah ada ... */}
  </form>
);
```

Tambahkan juga halaman manajemen template `TemplateManagementPage.tsx` yang bisa diakses dari menu Settings (hanya Level 2 ke atas). Halaman ini menampilkan daftar template yang ada dan memungkinkan pembuatan, pengeditan, serta penghapusan template.

---

## Fitur 2.3 — Laporan Kinerja Otomatis

### Latar Belakang & Nilai Bisnis

Ada paradoks yang sering terjadi di organisasi yang sudah menggunakan sistem digital: data tersedia lengkap di sistem, namun manajemen tetap meminta laporan manual yang memakan waktu berjam-jam setiap bulannya. Ini terjadi karena manajemen tidak selalu punya waktu atau kemauan untuk login ke sistem dan menginterpretasikan dashboard secara mandiri — mereka menginginkan laporan yang bisa dibaca dalam 2 menit tanpa harus klik sana-sini.

Fitur Laporan Otomatis menjembatani gap ini. Sistem secara otomatis menghasilkan laporan ringkas setiap Jumat sore (untuk laporan mingguan) dan di akhir setiap bulan (untuk laporan bulanan), kemudian mengirimkannya via email ke Kabid dan Sesper. Laporan ini berisi angka-angka kunci yang relevan, disajikan dalam format PDF yang rapi dan bisa langsung dibagikan atau diarsipkan.

### Perubahan Database

Tambahkan tabel untuk mencatat setiap laporan yang pernah dihasilkan sistem. Ini berguna untuk menghindari pengiriman duplikat dan untuk menyediakan arsip laporan yang bisa diakses kapanpun:

```prisma
model GeneratedReport {
  id           String @id @default(uuid())
  type         ReportType
  period_label String     // Contoh: "Minggu ke-12 2025" atau "Maret 2025"
  period_start DateTime
  period_end   DateTime
  file_url     String     // Path ke file PDF yang dihasilkan
  is_sent      Boolean @default(false)
  sent_at      DateTime?

  created_at DateTime @default(now())

  @@map("generated_reports")
}

enum ReportType {
  WEEKLY   // Laporan mingguan (setiap Jumat)
  MONTHLY  // Laporan bulanan (akhir bulan)
}
```

### Perubahan Backend — Report Generator Service

Buat `report-generator.service.ts` di modul Export yang sudah ada, atau buat modul `reports` baru jika skalanya besar:

```typescript
// report-generator.service.ts

@Injectable()
export class ReportGeneratorService {
  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private mailerService: MailerService,
  ) {}

  // Dipanggil oleh scheduler setiap Jumat jam 16.00
  async generateWeeklyReport() {
    const endDate   = endOfWeek(new Date(), { weekStartsOn: 1 }); // Jumat
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Senin

    const reportData = await this.collectReportData(startDate, endDate);
    const pdfBuffer  = await this.renderReportPdf(reportData, 'weekly');
    const filePath   = await this.saveReportFile(pdfBuffer, 'weekly', startDate);

    // Simpan record ke database
    await this.prisma.generatedReport.create({
      data: {
        type        : 'WEEKLY',
        period_label: `Minggu ${getWeek(startDate, { weekStartsOn: 1 })} — ${format(startDate, 'yyyy')}`,
        period_start: startDate,
        period_end  : endDate,
        file_url    : filePath,
      }
    });

    // Kirim ke Kabid dan Sesper
    await this.sendReportEmail(reportData, filePath, 'WEEKLY');
  }

  // Kumpulkan semua data yang diperlukan untuk laporan
  private async collectReportData(start: Date, end: Date) {
    const [
      projectsByStatus,
      projectsFinishedThisPeriod,
      projectsOverdue,
      newProjectsThisPeriod,
      serapanAnggaran,
    ] = await Promise.all([
      // Distribusi project per status saat ini
      this.prisma.project.groupBy({
        by     : ['status'],
        where  : { deleted_at: null },
        _count : true,
      }),
      // Project yang diselesaikan dalam periode ini
      this.prisma.project.findMany({
        where: {
          status    : 'FINISHED',
          updated_at: { gte: start, lte: end },
        },
        include: { pic: { select: { full_name: true } } }
      }),
      // Project yang melewati due date dan belum selesai
      this.prisma.project.findMany({
        where: {
          due_date  : { lt: new Date() },
          status    : { notIn: ['FINISHED', 'CANCELLED'] },
          deleted_at: null,
        },
        include: { pic: { select: { full_name: true } } }
      }),
      // Project baru yang dibuat dalam periode ini
      this.prisma.project.count({
        where: { created_at: { gte: start, lte: end } }
      }),
      // Serapan anggaran tahun berjalan
      this.prisma.$queryRaw`
        SELECT ap.nama_pos, ap.total_anggaran::float,
               COALESCE(SUM(ra.jumlah), 0)::float AS total_terserap
        FROM anggaran_pos ap
        LEFT JOIN realisasi_anggaran ra ON ra.anggaran_pos_id = ap.id
        WHERE ap.tahun = ${new Date().getFullYear()}
        GROUP BY ap.id, ap.nama_pos, ap.total_anggaran
      `
    ]);

    return {
      period: { start, end },
      projects: { by_status: projectsByStatus, finished: projectsFinishedThisPeriod,
                  overdue: projectsOverdue, new_count: newProjectsThisPeriod },
      anggaran: serapanAnggaran,
      generated_at: new Date(),
    };
  }

  // Render data ke template PDF menggunakan Puppeteer
  private async renderReportPdf(data: any, type: string): Promise<Buffer> {
    // HTML template laporan — bisa dibuat terpisah sebagai file .hbs
    const html = await this.compileReportTemplate(data, type);
    return this.exportService.htmlToPdf(html);
  }

  private async sendReportEmail(data: any, filePath: string, type: ReportType) {
    // Ambil semua user Level 1 dan Level 2 untuk dijadikan penerima
    const recipients = await this.prisma.user.findMany({
      where: {
        role     : { in: [UserRole.LEVEL_1, UserRole.LEVEL_2] },
        is_active: true,
      },
      select: { email: true, full_name: true }
    });

    for (const recipient of recipients) {
      await this.mailerService.sendMail({
        to      : recipient.email,
        subject : type === 'WEEKLY'
          ? `[ROCKET] Laporan Mingguan — ${format(data.period.start, 'dd MMM yyyy', { locale: id })}`
          : `[ROCKET] Laporan Bulanan — ${format(data.period.start, 'MMMM yyyy', { locale: id })}`,
        template: 'report-digest',
        context : { ...data, recipient_name: recipient.full_name },
        attachments: [{
          filename: path.basename(filePath),
          path    : filePath,
        }]
      });
    }
  }
}
```

Tambahkan dua cron job baru di `scheduler.service.ts`:

```typescript
// Laporan mingguan — setiap Jumat jam 16.00
@Cron('0 16 * * 5')
async sendWeeklyReport() {
  this.logger.log('Generating weekly report...');
  await this.reportGeneratorService.generateWeeklyReport();
}

// Laporan bulanan — tanggal 1 setiap bulan jam 06.00
@Cron('0 6 1 * *')
async sendMonthlyReport() {
  this.logger.log('Generating monthly report...');
  await this.reportGeneratorService.generateMonthlyReport();
}
```

Tambahkan juga endpoint untuk mengakses arsip laporan:

```typescript
// Di reports.controller.ts (baru)
@Get()
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
findAll(@Query() query: FilterReportDto) {
  return this.reportsService.findAll(query);
}

// Download ulang laporan yang sudah ada
@Get(':id/download')
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
download(@Param('id') id: string, @Res() res: Response) {
  return this.reportsService.streamReportFile(id, res);
}

// Generate laporan on-demand (tanpa menunggu cron)
@Post('generate')
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
generateManual(@Body() dto: GenerateReportDto) {
  return this.reportGeneratorService.generateOnDemand(dto);
}
```

### Perubahan Frontend

Tambahkan halaman baru `ReportsPage.tsx` di `src/pages/Reports/` yang menampilkan arsip semua laporan yang pernah dihasilkan. Halaman ini hanya terlihat untuk Level 2 ke atas di navigasi. Setiap baris di tabel laporan memiliki tombol "Unduh PDF" untuk mengunduh ulang laporan tersebut.

Tambahkan juga tombol "Generate Laporan Manual" untuk situasi ketika manajemen butuh laporan di luar jadwal rutin — misalnya sebelum rapat evaluasi yang mendadak.

Template email laporan `report-digest.hbs` perlu dibuat dengan tampilan yang ringkas namun informatif. Template ini menggunakan tabel HTML sederhana untuk menampilkan angka-angka kunci, kemudian di bawahnya memberitahu penerima bahwa laporan lengkap sudah terlampir sebagai PDF.

---

## Urutan Implementasi yang Disarankan

Urutan pengerjaan yang paling efisien untuk kelompok ini berbeda dari Kelompok 1 karena ada satu pertimbangan khusus.

**Template Project** sebaiknya dikerjakan pertama karena tidak memiliki dependensi terhadap fitur lain di kelompok ini, dan dampaknya dirasakan langsung sejak hari pertama setelah diluncurkan — terutama jika ada event besar yang akan datang dan tim perlu mempersiapkan banyak project serupa.

**Kalender** bisa dikerjakan bersamaan dengan Template Project oleh developer yang berbeda, namun idealnya dikerjakan kedua karena manfaatnya baru terasa maksimal ketika database sudah terisi cukup banyak project dari berbagai PIC dan periode.

**Laporan Otomatis** sebaiknya dikerjakan terakhir, bukan karena kurang penting, melainkan karena kualitas laporan sangat bergantung pada kualitas dan kelengkapan data di sistem. Laporan yang dihasilkan dari 2 minggu pemakaian akan terasa kurang bermakna dibandingkan laporan dari 3 bulan pemakaian. Disarankan untuk meluncurkan fitur ini setelah sistem sudah berjalan setidaknya satu bulan penuh.
