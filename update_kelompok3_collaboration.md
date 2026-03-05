# 🤝 Update Kelompok 3 — Fitur Kolaborasi & Visibilitas
### Aplikasi ROCKET | PT ASABRI (Persero)
> **Prioritas:** Menengah — Long Term (setelah Kelompok 2 selesai dan sistem sudah stabil 2–3 bulan)
> **Estimasi Total:** 5–7 minggu pengerjaan
> **Dampak:** Mentransformasi ROCKET dari working tracker menjadi platform kolaborasi kerja penuh

---

## Mengapa Kelompok Ini Baru Dikerjakan Setelah Kelompok 2

Ada alasan strategis mengapa kelompok ini berada di urutan ketiga. Fitur-fitur di sini bukan sekadar penambahan — mereka mengubah **bagaimana tim berinteraksi** dengan aplikasi secara fundamental. Kanban Board memberi cara pandang baru terhadap data yang sama. Workload Management memerlukan data historis yang cukup untuk menjadi bermakna. Integrasi Teams memerlukan kepercayaan yang sudah terbangun bahwa sistem ini benar-benar digunakan secara aktif. PWA menjadi paling berguna ketika fitur-fitur di Kelompok 1 dan 2 sudah ada — karena semakin banyak fitur yang bisa diakses offline, semakin tinggi nilainya.

Singkatnya, kelompok ini adalah "lapisan kedewasaan" dari ROCKET — fitur yang membuat aplikasi ini bukan lagi sekadar kebutuhan, melainkan sesuatu yang tim tidak bisa bayangkan bekerja tanpanya.

---

## Daftar Isi

1. [Fitur 3.1 — Board View (Kanban)](#fitur-31--board-view-kanban)
2. [Fitur 3.2 — Workload & Kapasitas Staff](#fitur-32--workload--kapasitas-staff)
3. [Fitur 3.3 — Integrasi Microsoft Teams](#fitur-33--integrasi-microsoft-teams)
4. [Fitur 3.4 — Progressive Web App (PWA)](#fitur-34--progressive-web-app-pwa)
5. [Urutan Implementasi yang Disarankan](#urutan-implementasi-yang-disarankan)

---

## Fitur 3.1 — Board View (Kanban)

### Latar Belakang & Nilai Bisnis

Tabel dan Kanban Board bukan kompetitor — mereka adalah dua cara pandang yang melengkapi satu sama lain terhadap data yang sama. Tabel unggul ketika kamu ingin mencari, mengurutkan, dan memfilter — "tampilkan semua project bulan Maret yang statusnya On Going milik Andris." Kanban unggul ketika kamu ingin memahami **aliran kerja** — "berapa banyak item yang sedang menunggu review, dan apakah ada kemacetan di salah satu tahap?"

Di lingkungan komunikasi dan protokoler seperti Kompro ASABRI, aliran kerja visual sangat relevan karena banyak pekerjaan bersifat pipeline — dimulai dari perencanaan, masuk ke eksekusi, lalu menunggu persetujuan, dan akhirnya selesai. Kanban membuat bottleneck (kemacetan) di pipeline ini langsung terlihat tanpa perlu analisis apapun.

### Perubahan Database

Kanban tidak memerlukan tabel baru sama sekali. Ini adalah kelebihan utama fitur ini dari sisi implementasi — semua data yang dibutuhkan sudah ada di tabel `projects`. Yang berubah hanya cara frontend **merender** data tersebut. Ini adalah contoh klasik bahwa tidak semua fitur baru harus mengubah database.

Satu-satunya perubahan database yang disarankan adalah menambahkan kolom `board_order` di tabel `projects` untuk menyimpan urutan kartu dalam setiap kolom Kanban. Tanpa ini, urutan kartu akan berubah-ubah setiap kali halaman di-refresh:

```prisma
// Tambahkan di model Project:
board_order Int @default(0)  // Urutan kartu dalam kolom Kanban
```

### Perubahan Backend

Tambahkan dua endpoint baru. Endpoint pertama untuk mengambil data yang sudah dikelompokkan per status (lebih efisien daripada membiarkan frontend mengelompokkan sendiri untuk dataset besar), dan endpoint kedua untuk menyimpan urutan saat kartu dipindahkan:

```typescript
// Tambahkan di projects.controller.ts

// Ambil project yang dikelompokkan per status untuk tampilan Kanban
@Get('board')
getBoardView(@CurrentUser() user: User, @Query() query: FilterProjectDto) {
  return this.projectsService.getBoardView(user, query);
}

// Dipanggil saat kartu di-drag ke kolom atau posisi lain
@Patch('board/reorder')
@Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
reorderBoard(@Body() dto: ReorderBoardDto) {
  return this.projectsService.reorderBoard(dto);
}
```

Implementasi `getBoardView` di service mengelompokkan project berdasarkan status, menghasilkan struktur data yang langsung siap dirender sebagai kolom:

```typescript
// projects.service.ts — tambahkan method ini

async getBoardView(user: User, query: FilterProjectDto) {
  const baseWhere = this.buildWhereClause(query, user);

  const projects = await this.prisma.project.findMany({
    where  : { ...baseWhere, deleted_at: null },
    include: {
      pic          : { select: { id: true, full_name: true } },
      sub_projects : { select: { id: true, status: true } },
      _count       : { select: { comments: true } }  // Dari Kelompok 1
    },
    orderBy: [{ board_order: 'asc' }, { due_date: 'asc' }]
  });

  // Kelompokkan project per status menggunakan reduce
  // Hasilnya: { FINISHED: [...], ON_GOING: [...], dst }
  const grouped = Object.values(ProjectStatus).reduce((acc, status) => {
    acc[status] = projects.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProjectStatus, any[]>);

  // Kembalikan dalam format yang siap dirender sebagai kolom
  return Object.entries(grouped).map(([status, items]) => ({
    id      : status,
    title   : this.getStatusLabel(status),
    color   : this.getStatusColor(status as ProjectStatus),
    count   : items.length,
    projects: items,
  }));
}

async reorderBoard(dto: ReorderBoardDto) {
  // dto berisi: projectId, newStatus, newOrder, dan oldStatus
  // Gunakan Prisma transaction untuk memastikan konsistensi

  return this.prisma.$transaction([
    // Update status project yang dipindahkan (jika pindah antar kolom)
    this.prisma.project.update({
      where: { id: dto.projectId },
      data : {
        status     : dto.newStatus as ProjectStatus,
        board_order: dto.newOrder,
      }
    }),
    // Update urutan project lain di kolom tujuan yang tergeser
    ...dto.affectedItems.map(item =>
      this.prisma.project.update({
        where: { id: item.id },
        data : { board_order: item.newOrder }
      })
    )
  ]);
}
```

DTO untuk reorder:

```typescript
// reorder-board.dto.ts
import { IsString, IsEnum, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AffectedItem {
  @IsString() id: string;
  @IsInt()    newOrder: number;
}

export class ReorderBoardDto {
  @IsString()          projectId     : string;
  @IsEnum(ProjectStatus) newStatus   : ProjectStatus;
  @IsInt()             newOrder      : number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AffectedItem)
  affectedItems: AffectedItem[];
}
```

### Perubahan Frontend

Install library drag-and-drop yang dibutuhkan. Pilihan yang sangat direkomendasikan adalah `@dnd-kit` karena ia modern, accessible (mendukung keyboard navigation), dan tidak memiliki ketergantungan pada DOM manipulation langsung (tidak konflik dengan React):

```bash
cd apps/frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Buat halaman `BoardPage.tsx` di `src/pages/Board/` dan komponen-komponen pendukungnya. Arsitektur komponen yang disarankan adalah sebagai berikut: `BoardPage` sebagai container utama yang menyimpan state dan mengelola drag-and-drop context, `KanbanColumn` sebagai komponen setiap kolom status, dan `ProjectCard` sebagai komponen kartu setiap project:

```tsx
// BoardPage.tsx — gambaran struktur utama

const BoardPage = () => {
  const { columns, reorder } = useBoardView();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Tentukan kolom tujuan dari ID drop target
    const sourceColumn = findColumnByProjectId(active.id as string, columns);
    const targetColumn = findColumnById(over.id as string, columns)
                      || findColumnByProjectId(over.id as string, columns);

    if (!sourceColumn || !targetColumn) return;

    // Optimistic update: ubah UI dulu sebelum API selesai
    // (pengguna langsung melihat perubahan, tidak perlu menunggu)
    const updatedColumns = moveProjectBetweenColumns(
      columns, active.id as string, sourceColumn.id, targetColumn.id
    );
    setOptimisticColumns(updatedColumns);

    // Lalu baru sinkronisasi ke backend
    try {
      await reorder({
        projectId    : active.id as string,
        newStatus    : targetColumn.id,
        newOrder     : calculateNewOrder(targetColumn, over.id as string),
        affectedItems: calculateAffectedItems(updatedColumns, targetColumn.id),
      });
    } catch {
      // Jika API gagal, kembalikan ke state semula (rollback optimistic update)
      setOptimisticColumns(columns);
      message.error('Gagal memindahkan project. Silakan coba lagi.');
    }
  };

  return (
    <PageWrapper title="Board View">
      {/* Toggle antara List View dan Board View */}
      <div className="flex justify-end mb-4">
        <Segmented
          options={[
            { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
            { label: 'Board', value: 'board', icon: <AppstoreOutlined /> },
          ]}
          value="board"
          onChange={/* navigate to /working-tracker jika pilih list */}
        />
      </div>

      {/* DndContext membungkus seluruh area drag-and-drop */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <KanbanColumn key={column.id} column={column} />
          ))}
        </div>
      </DndContext>
    </PageWrapper>
  );
};
```

Komponen `ProjectCard` perlu menampilkan informasi yang cukup tanpa terlalu padat. Kartu yang ideal menampilkan nama project, PIC (dengan avatar inisial), due date (merah jika H-3), badge status, dan jumlah komentar:

```tsx
// ProjectCard.tsx
const ProjectCard = ({ project }) => {
  const isDueSoon = isWithinDays(project.due_date, 3);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3
                    hover:shadow-md transition-shadow cursor-pointer"
         onClick={() => navigate(`/projects/${project.id}`)}>

      {/* Judul project — maksimal 2 baris */}
      <p className="font-medium text-gray-800 line-clamp-2 mb-2">
        {project.name}
      </p>

      {/* Due date dengan warna merah jika mendekati */}
      <div className={`flex items-center gap-1 text-xs mb-2
                       ${isDueSoon ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
        <CalendarOutlined />
        <span>{isDueSoon && '⚠ '}{formatDate(project.due_date)}</span>
      </div>

      {/* Footer: PIC dan jumlah komentar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <Avatar size="small" className="bg-asabri-blue text-xs">
            {getInitials(project.pic.full_name)}
          </Avatar>
          <span className="text-xs text-gray-500">{project.pic.full_name}</span>
        </div>
        {project._count.comments > 0 && (
          <span className="text-xs text-gray-400">
            <CommentOutlined /> {project._count.comments}
          </span>
        )}
      </div>
    </div>
  );
};
```

---

## Fitur 3.2 — Workload & Kapasitas Staff

### Latar Belakang & Nilai Bisnis

Distribusi beban kerja yang tidak merata adalah salah satu penyebab terbesar burnout dan keterlambatan di tim kecil. Tanpa visibilitas yang jelas, seorang Kabid sering kali tidak menyadari bahwa ia terus memberikan project baru kepada Staff yang sama hanya karena Staff tersebut yang paling terlihat aktif atau paling sering dilaporkan. Fitur Workload memberikan angka yang objektif untuk menggantikan intuisi.

Yang membuat implementasi ini menarik adalah cara kita **mendefinisikan "kapasitas"**. Tidak ada formula universal, sehingga kita membangun sistem yang fleksibel: Kabid bisa mengatur berapa maksimum project aktif yang dianggap "penuh" untuk setiap staff, dan sistem menghitung persentase kapasitas berdasarkan angka ini.

### Perubahan Database

Tambahkan kolom `max_active_projects` ke tabel `users` untuk menyimpan kapasitas maksimum per individu:

```prisma
// Tambahkan di model User:
max_active_projects Int @default(5)  // Default 5 project aktif = kapasitas penuh

// Tambahkan juga tabel untuk snapshot workload harian (untuk grafik tren)
model WorkloadSnapshot {
  id          String   @id @default(uuid())
  user_id     String
  user        User     @relation(fields: [user_id], references: [id])
  active_count Int      // Jumlah project aktif saat snapshot diambil
  snapshot_date DateTime @default(now())

  @@index([user_id, snapshot_date])
  @@map("workload_snapshots")
}
```

### Perubahan Backend

Tambahkan endpoint workload di modul users dan method snapshot di scheduler:

```typescript
// Endpoint baru di users.controller.ts

// Ambil workload semua staff (untuk tampilan di halaman Workload)
@Get('workload')
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
getTeamWorkload() {
  return this.usersService.getTeamWorkload();
}

// Update kapasitas maksimum seorang staff
@Patch(':id/capacity')
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
updateCapacity(
  @Param('id') id: string,
  @Body('max_active_projects') maxProjects: number
) {
  return this.usersService.updateCapacity(id, maxProjects);
}
```

Implementasi `getTeamWorkload` menghitung kapasitas real-time dengan query yang efisien:

```typescript
// users.service.ts — method getTeamWorkload

async getTeamWorkload() {
  // Ambil semua staff aktif
  const staff = await this.prisma.user.findMany({
    where    : { is_active: true, role: UserRole.LEVEL_3 },
    select   : { id: true, full_name: true, max_active_projects: true }
  });

  // Untuk setiap staff, hitung jumlah project aktif mereka
  const workloadData = await Promise.all(
    staff.map(async (member) => {
      const activeCount = await this.prisma.project.count({
        where: {
          pic_user_id: member.id,
          deleted_at : null,
          status     : { in: [ProjectStatus.ON_GOING, ProjectStatus.TO_DO_NEXT,
                               ProjectStatus.NEED_FOLLOW_UP, ProjectStatus.REVISI] }
        }
      });

      // Ambil project yang akan jatuh tempo minggu ini
      const upcomingDeadlines = await this.prisma.project.count({
        where: {
          pic_user_id: member.id,
          deleted_at : null,
          due_date   : {
            gte: new Date(),
            lte: addDays(new Date(), 7),
          },
          status: { notIn: [ProjectStatus.FINISHED, ProjectStatus.CANCELLED] }
        }
      });

      const capacityPct = Math.round((activeCount / member.max_active_projects) * 100);

      return {
        user                : member,
        active_count        : activeCount,
        max_capacity        : member.max_active_projects,
        capacity_percentage : Math.min(capacityPct, 100), // Cap di 100%
        is_overloaded       : activeCount > member.max_active_projects,
        upcoming_deadlines  : upcomingDeadlines,
        // Label deskriptif untuk UI
        load_label : capacityPct >= 100 ? 'Penuh'
                   : capacityPct >= 75  ? 'Sibuk'
                   : capacityPct >= 40  ? 'Normal'
                   : 'Ringan',
      };
    })
  );

  return workloadData.sort((a, b) => b.capacity_percentage - a.capacity_percentage);
}
```

Tambahkan cron job untuk mengambil snapshot workload harian — ini yang akan digunakan untuk menampilkan grafik tren workload:

```typescript
// Di scheduler.service.ts — cron job baru
@Cron('0 18 * * 1-5')  // Setiap hari kerja jam 18.00
async snapshotDailyWorkload() {
  const allStaff = await this.prisma.user.findMany({
    where: { is_active: true }
  });

  for (const user of allStaff) {
    const activeCount = await this.prisma.project.count({
      where: {
        pic_user_id: user.id,
        deleted_at : null,
        status     : { in: ['ON_GOING', 'TO_DO_NEXT', 'NEED_FOLLOW_UP', 'REVISI'] }
      }
    });

    await this.prisma.workloadSnapshot.create({
      data: { user_id: user.id, active_count: activeCount }
    });
  }
}
```

### Perubahan Frontend

Buat halaman `WorkloadPage.tsx` di `src/pages/Workload/` yang hanya terlihat untuk Level 2 ke atas. Halaman ini menampilkan dua panel: panel kiri berisi daftar staff dengan gauge kapasitas masing-masing, dan panel kanan menampilkan detail project yang sedang dikerjakan staff yang dipilih.

Gauge kapasitas bisa diimplementasikan menggunakan komponen `Progress` dari Ant Design dengan warna yang berubah sesuai persentase: hijau untuk ringan, kuning untuk normal, oranye untuk sibuk, dan merah untuk overloaded.

Integrasi dengan form pembuatan project juga penting: ketika Kabid memilih PIC di form project, tampilkan tag kecil di bawah dropdown yang menunjukkan kapasitas PIC tersebut saat ini. Jika kapasitas sudah di atas 80%, tampilkan peringatan kuning. Jika sudah 100% atau lebih, tampilkan peringatan merah — namun tidak memblokir pembuatan project karena ada situasi darurat yang tidak bisa ditolak.

---

## Fitur 3.3 — Integrasi Microsoft Teams

### Latar Belakang & Nilai Bisnis

Mengintegrasikan ROCKET dengan Microsoft Teams bukan hanya soal kenyamanan — ini tentang **bertemu pengguna di mana mereka sudah berada**. Tim Kompro kemungkinan sudah menggunakan Teams setiap hari untuk komunikasi. Jika notifikasi ROCKET muncul di Teams, kemungkinan untuk dilihat dan direspons jauh lebih tinggi dibandingkan email yang bisa tertimbun ratusan pesan lain.

Pendekatan yang dipilih adalah **Incoming Webhook** — sebuah mekanisme built-in di Microsoft Teams yang tidak memerlukan registrasi aplikasi di Azure AD, tidak memerlukan persetujuan IT, dan bisa disetup dalam 5 menit oleh siapapun yang punya akses ke channel Teams. Ini adalah cara paling pragmatis untuk memulai integrasi.

### Perubahan Database

Tambahkan tabel untuk menyimpan konfigurasi webhook Teams. Satu tim bisa memiliki beberapa channel Teams yang terhubung dengan tujuan notifikasi yang berbeda:

```prisma
model TeamsWebhookConfig {
  id           String  @id @default(uuid())
  channel_name String  // Nama tampilan channel, contoh: "Kompro - Working Tracker"
  webhook_url  String  @db.Text  // URL webhook dari Teams
  is_active    Boolean @default(true)

  // Jenis notifikasi apa saja yang dikirim ke channel ini
  // Disimpan sebagai array string JSON
  notification_types String[]  // Contoh: ["REVIEW_REQUESTED", "DUE_DATE_REMINDER"]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("teams_webhook_configs")
}
```

### Perubahan Backend

Buat service baru `teams-webhook.service.ts` yang bertugas memformat dan mengirim pesan ke Teams:

```typescript
// teams-webhook.service.ts

@Injectable()
export class TeamsWebhookService {
  private readonly logger = new Logger(TeamsWebhookService.name);

  constructor(
    private prisma  : PrismaService,
    private http    : HttpService,  // @nestjs/axios
  ) {}

  // Method utama yang dipanggil oleh NotificationsService
  async sendNotification(type: NotificationType, data: any) {
    // Cari konfigurasi webhook yang aktif dan menerima tipe notifikasi ini
    const configs = await this.prisma.teamsWebhookConfig.findMany({
      where: {
        is_active          : true,
        notification_types : { has: type },
      }
    });

    // Kirim ke semua channel yang relevan
    await Promise.allSettled(
      configs.map(config =>
        this.sendToChannel(config.webhook_url, this.buildCard(type, data))
      )
    );
  }

  private async sendToChannel(webhookUrl: string, card: any) {
    try {
      await this.http.post(webhookUrl, card).toPromise();
    } catch (error) {
      // Jangan lempar error — kegagalan kirim ke Teams tidak boleh
      // mengganggu operasi utama aplikasi
      this.logger.warn(`Gagal kirim ke Teams webhook: ${error.message}`);
    }
  }

  // Bangun Adaptive Card Teams — format kartu interaktif yang kaya visual
  private buildCard(type: NotificationType, data: any) {
    // Teams menggunakan format "Adaptive Card" untuk pesan yang kaya visual.
    // Format lengkap: https://adaptivecards.io/designer/
    const cardsByType = {
      REVIEW_REQUESTED: this.buildReviewRequestedCard(data),
      REVIEW_APPROVED : this.buildReviewApprovedCard(data),
      DUE_DATE_REMINDER: this.buildDueDateReminderCard(data),
    };

    return {
      type       : "message",
      attachments: [{
        contentType: "application/vnd.microsoft.card.adaptive",
        content    : cardsByType[type] || this.buildGenericCard(data),
      }]
    };
  }

  private buildReviewRequestedCard(data: { project: any; submitter: any }) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type"   : "AdaptiveCard",
      "version": "1.4",
      "body"   : [
        {
          "type"  : "TextBlock",
          "text"  : "📋 Review Diperlukan",
          "weight": "Bolder",
          "size"  : "Medium",
          "color" : "Accent",
        },
        {
          "type": "FactSet",
          "facts": [
            { "title": "Project", "value": data.project.name },
            { "title": "Diajukan oleh", "value": data.submitter.full_name },
            { "title": "Due Date", "value": formatDate(data.project.due_date) },
            { "title": "Status", "value": data.project.status },
          ]
        }
      ],
      "actions": [{
        "type"  : "Action.OpenUrl",
        "title" : "Buka di ROCKET",
        // URL langsung ke halaman review project ini
        "url"   : `${process.env.FRONTEND_URL}/review/${data.project.id}`,
      }]
    };
  }
}
```

Modifikasi `NotificationsService` untuk memanggil `TeamsWebhookService` setiap kali notifikasi dibuat:

```typescript
// Di notifications.service.ts — modifikasi method create

async create(createNotifDto: CreateNotificationDto) {
  // Simpan ke database seperti sebelumnya
  const notification = await this.prisma.notification.create({
    data: createNotifDto
  });

  // Kirim email seperti sebelumnya
  await this.sendEmail(notification);

  // BARU: Kirim ke Teams jika ada webhook yang dikonfigurasi
  // Ini berjalan secara fire-and-forget, tidak menghalangi response
  this.teamsWebhookService.sendNotification(
    createNotifDto.type,
    createNotifDto.relatedData  // Data konteks yang relevan
  ).catch(err => this.logger.warn('Teams notification failed silently'));

  return notification;
}
```

Tambahkan CRUD endpoint untuk mengelola konfigurasi webhook (hanya Super User dan Level 1):

```typescript
// teams-config.controller.ts

@Controller('settings/teams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
export class TeamsConfigController {
  @Get()    findAll() { ... }
  @Post()   create(@Body() dto: CreateWebhookDto) { ... }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) { ... }
  @Delete(':id') remove(@Param('id') id: string) { ... }

  // Endpoint untuk test webhook sebelum disimpan
  @Post('test')
  testWebhook(@Body('webhook_url') url: string) {
    return this.teamsWebhookService.sendTestMessage(url);
  }
}
```

### Perubahan Frontend

Tambahkan section baru "Integrasi Microsoft Teams" di halaman Settings (hanya terlihat untuk Super User dan Level 1). Section ini menampilkan daftar webhook yang sudah dikonfigurasi, tombol untuk menambah webhook baru, dan toggle untuk mengaktifkan/menonaktifkan setiap webhook.

Sertakan panduan visual singkat di halaman ini yang menjelaskan cara mendapatkan URL webhook dari Teams — dengan screenshot atau instruksi langkah demi langkah. Ini penting agar admin bisa melakukan konfigurasi sendiri tanpa bantuan teknis.

---

## Fitur 3.4 — Progressive Web App (PWA)

### Latar Belakang & Nilai Bisnis

PWA bukan hanya tentang membuat aplikasi bisa diinstall di ponsel. Manfaat yang jauh lebih besar adalah kemampuannya untuk **bekerja dengan koneksi yang tidak stabil**. Di lingkungan kantor ASABRI, karyawan yang berpindah dari satu ruangan ke ruangan lain, atau yang mengakses sistem dari cabang, kadang menghadapi koneksi yang putus-nyambung. PWA dengan Service Worker yang dikonfigurasi dengan baik memastikan bahwa pengguna tetap bisa membaca data yang terakhir mereka akses, bahkan ketika koneksi sedang tidak ada.

Manfaat tambahan yang juga signifikan adalah **kecepatan loading**. Setelah kunjungan pertama, sebagian besar aset (HTML, CSS, JavaScript) sudah di-cache oleh Service Worker, sehingga loading halaman berikutnya terasa jauh lebih cepat.

### Perubahan Database

PWA tidak memerlukan perubahan apapun di database backend. Seluruh implementasinya ada di sisi frontend.

### Perubahan Backend

Satu-satunya perubahan di backend adalah menambahkan endpoint untuk mengirim **Web Push Notifications** — notifikasi yang muncul di sistem operasi (bukan hanya di dalam aplikasi), bahkan ketika browser sedang tidak membuka ROCKET. Ini memerlukan library `web-push`:

```bash
cd apps/backend
npm install web-push
npm install -D @types/web-push
```

```typescript
// push-notifications.service.ts

import * as webpush from 'web-push';

@Injectable()
export class PushNotificationsService {
  constructor(private prisma: PrismaService) {
    // Konfigurasi VAPID keys — generate sekali dengan: npx web-push generate-vapid-keys
    webpush.setVapidDetails(
      'mailto:admin@asabri.co.id',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }

  // Simpan subscription dari browser pengguna
  async saveSubscription(userId: string, subscription: PushSubscription) {
    await this.prisma.pushSubscription.upsert({
      where : { user_id: userId },
      update: { subscription: JSON.stringify(subscription) },
      create: { user_id: userId, subscription: JSON.stringify(subscription) }
    });
  }

  // Kirim push notification ke user tertentu
  async sendPushToUser(userId: string, payload: { title: string; body: string; url: string }) {
    const sub = await this.prisma.pushSubscription.findUnique({
      where: { user_id: userId }
    });
    if (!sub) return;

    try {
      await webpush.sendNotification(
        JSON.parse(sub.subscription),
        JSON.stringify(payload)
      );
    } catch (err) {
      // Subscription mungkin sudah expired — hapus dari database
      if (err.statusCode === 410) {
        await this.prisma.pushSubscription.delete({ where: { user_id: userId } });
      }
    }
  }
}
```

Tambahkan tabel untuk menyimpan push subscription di database:

```prisma
model PushSubscription {
  id           String   @id @default(uuid())
  user_id      String   @unique
  user         User     @relation(fields: [user_id], references: [id])
  subscription String   @db.Text  // JSON string subscription object
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@map("push_subscriptions")
}
```

### Perubahan Frontend

Install plugin PWA untuk Vite:

```bash
cd apps/frontend
npm install -D vite-plugin-pwa
```

Konfigurasi PWA di `vite.config.ts`:

```typescript
// vite.config.ts — tambahkan plugin PWA
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',  // Service Worker otomatis update saat ada versi baru
      includeAssets: ['favicon.ico', 'logo-asabri.png'],
      manifest: {
        name            : 'ROCKET — PT ASABRI',
        short_name      : 'ROCKET',
        description     : 'Review, Organize, Control, and Keep Everything on Track',
        theme_color     : '#0D2B6B',
        background_color: '#ffffff',
        display         : 'standalone',  // Tampil seperti aplikasi native (tanpa browser UI)
        start_url       : '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ]
      },
      workbox: {
        // Strategi cache untuk berbagai tipe request:
        runtimeCaching: [
          {
            // API calls: Network First (selalu coba ambil dari server,
            // gunakan cache hanya jika offline)
            urlPattern : /\/api\//,
            handler    : 'NetworkFirst',
            options    : {
              cacheName             : 'api-cache',
              expiration            : { maxEntries: 100, maxAgeSeconds: 3600 },
              networkTimeoutSeconds : 10,  // Fallback ke cache setelah 10 detik
            }
          },
          {
            // Static assets: Cache First (gunakan cache, update di background)
            urlPattern : /\.(js|css|png|svg|woff2)$/,
            handler    : 'CacheFirst',
            options    : {
              cacheName : 'static-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } // 30 hari
            }
          }
        ]
      }
    })
  ]
});
```

Tambahkan komponen `InstallPrompt.tsx` yang muncul di pojok bawah layar ketika browser mendeteksi bahwa aplikasi bisa diinstall:

```tsx
// components/common/InstallPrompt.tsx

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Browser menembak event ini ketika PWA bisa diinstall
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();  // Tampilkan dialog install sistem operasi
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80
                    bg-asabri-blue text-white rounded-lg shadow-xl p-4 z-50">
      <p className="font-semibold mb-1">Install Aplikasi ROCKET</p>
      <p className="text-sm text-blue-200 mb-3">
        Install di perangkat Anda untuk akses lebih cepat dan notifikasi real-time.
      </p>
      <div className="flex gap-2 justify-end">
        <Button size="small" onClick={() => setShowBanner(false)}
                className="text-white border-white">Nanti</Button>
        <Button size="small" type="primary" onClick={handleInstall}
                className="bg-asabri-gold border-asabri-gold text-white">
          Install
        </Button>
      </div>
    </div>
  );
};
```

---

## Urutan Implementasi yang Disarankan

Kelompok 3 memiliki fleksibilitas yang lebih tinggi dalam urutan pengerjaan dibandingkan kelompok sebelumnya, karena keempat fiturnya relatif independen satu sama lain.

Mulailah dengan **PWA** karena ini adalah fondasi infrastruktur yang manfaatnya bersifat kumulatif — semakin cepat diaktifkan, semakin banyak pengguna yang terbiasa menginstall dan menggunakan aplikasi via ponsel. Implementasinya juga yang paling tidak berisiko karena tidak mengubah logika bisnis apapun, hanya menambahkan Service Worker.

Lanjutkan dengan **Kanban Board** karena ini adalah fitur yang paling sering diminta dan paling terlihat. Setelah Kanban diluncurkan, lakukan sesi demo singkat kepada tim untuk menunjukkan cara penggunaannya — terutama fitur drag-and-drop yang mungkin tidak intuitif bagi semua orang.

Kemudian kerjakan **Workload Management** setelah data snapshot sudah terkumpul minimal 4 minggu dari cron job yang dipasang bersamaan dengan feature ini. Grafik tren workload tidak akan bermakna jika datanya baru ada 2-3 hari.

Terakhir, kerjakan **Integrasi Teams** setelah berkoordinasi dengan tim IT ASABRI untuk memastikan akses ke Microsoft Teams Incoming Webhook diizinkan dari sisi kebijakan IT perusahaan.
