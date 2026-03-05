# 🚀 Update Kelompok 1 — Quick Win
### Aplikasi ROCKET | PT ASABRI (Persero)
> **Prioritas:** Tertinggi — Implementasi Segera
> **Estimasi Total:** 2–3 minggu pengerjaan
> **Dampak:** Langsung dirasakan pengguna setiap hari

---

## Mengapa Kelompok Ini Harus Dikerjakan Pertama

Sebelum masuk ke detail teknis, penting untuk memahami filosofi di balik pengelompokan ini. "Quick Win" bukan berarti fitur yang sepele — justru sebaliknya. Fitur-fitur di kelompok ini dipilih karena memenuhi dua kriteria sekaligus: **infrastrukturnya sudah sebagian besar tersedia** di codebase yang ada (jadi tidak perlu membangun fondasi baru), dan **dampaknya dirasakan setiap hari** oleh seluruh pengguna tanpa terkecuali.

Strategi ini penting dari sudut pandang adopsi teknologi. Ketika pengguna merasakan peningkatan nyata dalam waktu singkat setelah peluncuran awal, kepercayaan dan antusiasme mereka terhadap sistem akan meningkat — dan ini membuat proses implementasi fitur-fitur yang lebih kompleks di kelompok berikutnya menjadi jauh lebih mudah secara organisasional.

---

## Daftar Isi

1. [Fitur 1.1 — Komentar & Diskusi di Dalam Project](#fitur-11--komentar--diskusi-di-dalam-project)
2. [Fitur 1.2 — Riwayat Perubahan (Activity Log)](#fitur-12--riwayat-perubahan-activity-log)
3. [Fitur 1.3 — Pengingat Deadline yang Dikustomisasi](#fitur-13--pengingat-deadline-yang-dikustomisasi)
4. [Urutan Implementasi yang Disarankan](#urutan-implementasi-yang-disarankan)

---

## Fitur 1.1 — Komentar & Diskusi di Dalam Project

### Latar Belakang & Nilai Bisnis

Saat ini, ketika Kabid punya pertanyaan tentang update sebuah project, komunikasinya terjadi di luar sistem — via WhatsApp, email, atau tatap muka. Konsekuensinya adalah konteks diskusi tersebut **tidak pernah terhubung dengan project yang dibicarakan**. Enam bulan kemudian, ketika ada audit atau evaluasi, tidak ada rekam jejak mengapa sebuah keputusan diambil, mengapa due date digeser, atau siapa yang meminta perubahan tertentu.

Fitur komentar memindahkan diskusi ini ke dalam sistem, sehingga setiap project membawa "memori institusionalnya" sendiri. Ini bukan sekadar fitur kenyamanan — ini adalah fitur **akuntabilitas**.

### Perubahan Database

Tambahkan tabel baru `project_comments` ke `schema.prisma`:

```prisma
model ProjectComment {
  id         String   @id @default(uuid())

  // Project yang dikomentari
  project_id String
  project    Project  @relation(fields: [project_id], references: [id], onDelete: Cascade)

  // User yang menulis komentar
  author_id  String
  author     User     @relation("CommentAuthor", fields: [author_id], references: [id])

  // Isi komentar
  message    String   @db.Text

  // Untuk fitur reply: jika null berarti komentar utama,
  // jika diisi berarti ini adalah balasan dari komentar lain
  parent_id  String?
  parent     ProjectComment?  @relation("CommentReplies", fields: [parent_id], references: [id])
  replies    ProjectComment[] @relation("CommentReplies")

  // Komentar bisa diedit, kita simpan timestamp editnya
  edited_at  DateTime?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([project_id])
  @@index([author_id])
  @@map("project_comments")
}
```

Jangan lupa tambahkan relasi balik di model `Project` dan `User` yang sudah ada:

```prisma
// Di dalam model Project — tambahkan baris ini:
comments ProjectComment[]

// Di dalam model User — tambahkan baris ini:
comments_authored ProjectComment[] @relation("CommentAuthor")
```

### Perubahan Backend

Buat modul baru `comments` di `apps/backend/src/modules/comments/`. Strukturnya mengikuti pola yang sama dengan modul-modul yang sudah ada.

File `comments.controller.ts` mengelola tiga endpoint utama. `GET /api/projects/:projectId/comments` mengambil semua komentar beserta reply-nya secara terurut dari yang terlama. `POST /api/projects/:projectId/comments` membuat komentar baru — body berisi `message` (wajib) dan `parent_id` (opsional, untuk reply). `DELETE /api/projects/:projectId/comments/:commentId` menghapus komentar, namun hanya bisa dilakukan oleh penulis komentar itu sendiri atau Level 2 ke atas.

```typescript
// comments.service.ts — method utama
async findAllByProject(projectId: string) {
  // Ambil hanya komentar level teratas (parent_id = null),
  // kemudian sertakan replies-nya secara nested.
  // Dengan cara ini, frontend tidak perlu melakukan query lagi untuk replies.
  return this.prisma.projectComment.findMany({
    where: {
      project_id: projectId,
      parent_id: null,        // Hanya komentar utama
    },
    include: {
      author: {
        select: { id: true, full_name: true, role: true }
      },
      replies: {
        include: {
          author: {
            select: { id: true, full_name: true, role: true }
          }
        },
        orderBy: { created_at: 'asc' }
      }
    },
    orderBy: { created_at: 'asc' }
  });
}

async create(projectId: string, authorId: string, dto: CreateCommentDto) {
  const comment = await this.prisma.projectComment.create({
    data: {
      project_id: projectId,
      author_id : authorId,
      message   : dto.message,
      parent_id : dto.parent_id || null,
    },
    include: {
      author: { select: { id: true, full_name: true, role: true } }
    }
  });

  // Kirim notifikasi ke PIC project bahwa ada komentar baru,
  // tapi hanya jika yang berkomentar bukan PIC itu sendiri.
  await this.notificationsService.notifyNewComment(projectId, authorId, comment.id);

  return comment;
}
```

Untuk DTO-nya, `CreateCommentDto` sangat sederhana:

```typescript
// create-comment.dto.ts
import { IsString, MinLength, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: 'Komentar tidak boleh kosong' })
  message: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;  // Jika diisi, ini adalah reply dari komentar tersebut
}
```

### Perubahan Frontend

Komentar ditampilkan di `ProjectDetailPage.tsx` sebagai section baru di bawah informasi project dan sub project. Tidak perlu halaman terpisah — komentar adalah bagian integral dari detail project, bukan fitur yang terpisah.

Buat komponen baru `components/comments/CommentSection.tsx` yang bertanggung jawab menampilkan daftar komentar dan form input. Komponen ini menerima `projectId` sebagai prop dan menggunakan hook `useComments(projectId)` untuk fetching.

```tsx
// Gambaran struktur komponen CommentSection
// Perhatikan bagaimana threading (reply) dirender secara rekursif

const CommentItem = ({ comment, onReply }) => (
  <div className="flex gap-3">
    {/* Avatar dengan inisial nama user */}
    <Avatar name={comment.author.full_name} />
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{comment.author.full_name}</span>
        <RoleBadge role={comment.author.role} />
        <span className="text-gray-400 text-xs">
          {formatRelativeTime(comment.created_at)}
        </span>
        {comment.edited_at && (
          <span className="text-gray-400 text-xs">(diedit)</span>
        )}
      </div>
      <p className="mt-1 text-gray-700">{comment.message}</p>
      <button onClick={() => onReply(comment.id)}
              className="text-xs text-asabri-blue mt-1 hover:underline">
        Balas
      </button>

      {/* Render replies secara rekursif dengan indentasi */}
      {comment.replies?.length > 0 && (
        <div className="mt-3 ml-4 border-l-2 border-gray-200 pl-4 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  </div>
);
```

Tambahkan juga hook `useComments.ts` di folder `hooks/`:

```typescript
// hooks/useComments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '@services/commentService';

export const useComments = (projectId: string) => {
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['comments', projectId],
    queryFn: () => commentService.findAll(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { message: string; parent_id?: string }) =>
      commentService.create(projectId, data),
    // Setelah berhasil membuat komentar, refresh daftar komentar otomatis
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
    }
  });

  return { ...commentsQuery, createComment: createMutation.mutate };
};
```

### Notifikasi yang Perlu Ditambahkan

Tambahkan tipe notifikasi baru di enum `NotificationType` di `schema.prisma`:

```prisma
enum NotificationType {
  // ... yang sudah ada ...
  NEW_COMMENT   // Ada komentar baru di project milik atau yang di-assign ke user ini
}
```

---

## Fitur 1.2 — Riwayat Perubahan (Activity Log)

### Latar Belakang & Nilai Bisnis

Di lingkungan BUMN, pertanyaan "siapa yang mengubah apa dan kapan?" bukan hanya pertanyaan teknis — ini adalah pertanyaan kepatuhan (*compliance*). Ketika audit internal atau BPK melakukan pemeriksaan, kemampuan untuk menunjukkan jejak perubahan data secara lengkap adalah hal yang sangat kritis. Fitur Activity Log menjawab kebutuhan ini secara menyeluruh tanpa mengubah apapun di cara pengguna bekerja — semua pencatatan terjadi secara otomatis di background.

Yang membuat fitur ini istimewa dari sisi implementasi adalah pendekatannya menggunakan **Prisma Middleware** — sebuah fungsi yang dipasang sekali di `PrismaService` dan secara otomatis mencegat setiap operasi tulis ke database, tanpa perlu mengubah satu baris pun di service-service yang sudah ada.

### Perubahan Database

Tambahkan tabel `activity_logs` ke `schema.prisma`:

```prisma
model ActivityLog {
  id          String   @id @default(uuid())

  // Siapa yang melakukan perubahan
  user_id     String
  user        User     @relation(fields: [user_id], references: [id])

  // Entitas apa yang berubah (misal: "Project", "AnggaranPos")
  entity_type String

  // ID record yang berubah
  entity_id   String

  // Aksi yang dilakukan: CREATE, UPDATE, DELETE
  action      String

  // Nilai sebelum dan sesudah perubahan dalam format JSON
  // Contoh old_value: { "status": "ON_GOING", "due_date": "2025-03-15" }
  // Contoh new_value: { "status": "RESCHEDULED", "due_date": "2025-03-22" }
  old_value   Json?
  new_value   Json?

  // Deskripsi manusiawi dari perubahan ini (di-generate otomatis)
  // Contoh: "Mengubah status dari 'On Going' menjadi 'Rescheduled'"
  description String?

  created_at  DateTime @default(now())

  // Indeks berganda untuk query yang umum: "semua log untuk project X"
  @@index([entity_type, entity_id])
  @@index([user_id])
  @@index([created_at])
  @@map("activity_logs")
}
```

Tambahkan relasi balik di model `User`:
```prisma
// Di model User:
activity_logs ActivityLog[]
```

### Perubahan Backend — Prisma Middleware

Ini adalah bagian paling elegan dari implementasi ini. Alih-alih menambahkan kode logging di setiap service satu per satu (yang rentan terlewat), kita menggunakan satu middleware terpusat.

Tambahkan method `setupLoggingMiddleware()` di `prisma.service.ts`:

```typescript
// prisma.service.ts — tambahkan middleware logging

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage memungkinkan kita menyimpan konteks (user yang sedang aktif)
// per-request, seperti "thread-local storage" di bahasa lain.
// Ini perlu karena middleware Prisma tidak punya akses ke request HTTP.
export const requestContext = new AsyncLocalStorage<{ userId: string }>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    this.setupLoggingMiddleware();
  }

  private setupLoggingMiddleware() {
    // Entitas yang ingin kita catat perubahannya
    const TRACKED_MODELS = ['Project', 'SubProject', 'AnggaranPos', 'RealisasiAnggaran'];

    this.$use(async (params, next) => {
      // Hanya catat untuk model yang dipantau
      if (!TRACKED_MODELS.includes(params.model)) {
        return next(params);
      }

      // Hanya catat untuk operasi tulis
      const isWriteOperation = ['create', 'update', 'delete',
                                'updateMany', 'deleteMany'].includes(params.action);
      if (!isWriteOperation) {
        return next(params);
      }

      // Ambil nilai lama sebelum perubahan (untuk operasi update dan delete)
      let oldValue = null;
      if (params.action === 'update' || params.action === 'delete') {
        try {
          // @ts-ignore — dynamic model access
          oldValue = await this[params.model.toLowerCase()].findUnique({
            where: params.args.where
          });
        } catch { /* abaikan jika tidak bisa diambil */ }
      }

      // Jalankan operasi aslinya
      const result = await next(params);

      // Ambil user ID dari konteks request saat ini
      const context = requestContext.getStore();
      const userId = context?.userId;

      // Catat log jika ada user yang sedang aktif
      if (userId) {
        await this.activityLog.create({
          data: {
            user_id    : userId,
            entity_type: params.model,
            entity_id  : result?.id || params.args?.where?.id || 'unknown',
            action     : params.action.toUpperCase(),
            old_value  : oldValue ? this.sanitizeValue(oldValue) : null,
            new_value  : result ? this.sanitizeValue(result) : null,
            description: this.generateDescription(params.model, params.action,
                                                   oldValue, result),
          }
        });
      }

      return result;
    });
  }

  // Hapus field sensitif sebelum disimpan ke log
  private sanitizeValue(value: any) {
    const { created_at, updated_at, ...rest } = value;
    return rest;
  }

  // Generate deskripsi yang mudah dibaca manusia
  private generateDescription(model: string, action: string,
                               oldVal: any, newVal: any): string {
    if (action === 'create') return `Membuat ${model} baru`;
    if (action === 'delete') return `Menghapus ${model}`;
    if (action === 'update' && oldVal?.status !== newVal?.status) {
      return `Mengubah status dari '${oldVal.status}' menjadi '${newVal.status}'`;
    }
    if (action === 'update' && oldVal?.due_date !== newVal?.due_date) {
      return `Mengubah due date dari '${oldVal.due_date}' menjadi '${newVal.due_date}'`;
    }
    return `Memperbarui ${model}`;
  }
}
```

Agar middleware bisa mengetahui siapa user yang sedang melakukan request, kita perlu mengisi `requestContext` di setiap request. Lakukan ini di `LoggingInterceptor` yang sudah ada:

```typescript
// logging.interceptor.ts — tambahkan pengisian context

import { requestContext } from '../prisma/prisma.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;  // Diisi oleh JwtAuthGuard

    // Jalankan handler request dalam konteks yang menyimpan userId
    // Semua operasi Prisma yang terjadi selama request ini
    // akan otomatis tercatat dengan userId yang benar
    return new Observable(observer => {
      requestContext.run({ userId }, () => {
        next.handle().subscribe({
          next: (value) => observer.next(value),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
```

### Perubahan Backend — Activity Log Module

Tambahkan modul baru `activity-log` yang menyediakan endpoint untuk membaca log:

```typescript
// activity-log.controller.ts

@Controller('activity-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogController {

  // Ambil histori perubahan untuk satu project tertentu
  // Ini yang ditampilkan di halaman detail project sebagai timeline
  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.activityLogService.findByEntity('Project', projectId);
  }

  // Ambil semua aktivitas terbaru di seluruh sistem
  // Hanya bisa diakses Super User dan Level 1
  @Get()
  @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
  findAll(@Query() query: FilterActivityLogDto) {
    return this.activityLogService.findAll(query);
  }
}
```

### Perubahan Frontend

Tampilkan activity log di `ProjectDetailPage.tsx` sebagai tab "Aktivitas" di samping tab "Detail" dan "Komentar". Ini membuat halaman detail project menjadi sangat informatif — satu halaman yang berisi semua yang perlu diketahui tentang sebuah project.

```tsx
// Di ProjectDetailPage.tsx — tambahkan tab Aktivitas
// Gunakan komponen Tabs dari Ant Design

<Tabs defaultActiveKey="detail">
  <Tabs.TabPane tab="Detail Project" key="detail">
    {/* Konten detail yang sudah ada */}
  </Tabs.TabPane>

  <Tabs.TabPane tab="Komentar" key="comments">
    <CommentSection projectId={projectId} />
  </Tabs.TabPane>

  <Tabs.TabPane tab="Aktivitas" key="activity">
    <ActivityTimeline projectId={projectId} />
  </Tabs.TabPane>
</Tabs>
```

Buat komponen `ActivityTimeline.tsx` di `components/activity/` yang merender log dalam bentuk timeline vertikal menggunakan komponen `Timeline` dari Ant Design. Setiap entri timeline menampilkan avatar user, deskripsi perubahan, dan waktu relatif (misalnya "2 jam yang lalu", "kemarin").

---

## Fitur 1.3 — Pengingat Deadline yang Dikustomisasi

### Latar Belakang & Nilai Bisnis

Sistem notifikasi H-3 yang sudah ada berjalan secara seragam untuk semua pengguna. Ini adalah titik awal yang baik, namun setiap individu memiliki ritme kerja yang berbeda. Staff yang bertanggung jawab atas banyak project mungkin ingin diingatkan H-7 agar punya cukup waktu mempersiapkan diri. Sementara project yang sifatnya rutin mungkin tidak perlu reminder sama sekali.

Dengan memberi pengguna kendali atas preferensi notifikasi mereka, sistem menghindari masalah klasik yang disebut **"notification fatigue"** — ketika notifikasi terlalu sering atau tidak relevan, pengguna mulai mengabaikannya, dan notifikasi yang benar-benar penting pun ikut terlewat.

### Perubahan Database

Tambahkan tabel `user_notification_preferences` untuk menyimpan preferensi setiap user:

```prisma
model UserNotificationPreference {
  id      String @id @default(uuid())

  user_id String @unique
  user    User   @relation(fields: [user_id], references: [id])

  // Berapa hari sebelum due date reminder dikirim
  // Default: 3 (sesuai behavior saat ini)
  reminder_days_before Int @default(3)

  // Apakah mau menerima notifikasi via email (selain in-app)?
  email_notifications_enabled Boolean @default(true)

  // Jam berapa reminder dikirim (0-23, format 24 jam)
  // Default: 7 (jam 07.00 pagi, sesuai cron job saat ini)
  reminder_hour Int @default(7)

  // Apakah aktifkan weekly digest setiap Jumat sore?
  weekly_digest_enabled Boolean @default(false)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("user_notification_preferences")
}
```

Tambahkan relasi di model `User`:
```prisma
// Di model User:
notification_preference UserNotificationPreference?
```

Catatan penting: relasi ini bersifat opsional (`?`) karena preference dibuat dengan nilai default pertama kali user mengakses halaman settings. Sebelum itu, sistem menggunakan nilai default hardcoded (H-3, jam 07.00).

### Perubahan Backend — Scheduler yang Dinamis

Scheduler yang ada perlu dimodifikasi agar membaca preferensi dari database, bukan menggunakan nilai statis:

```typescript
// scheduler.service.ts — versi baru yang membaca preferensi user

@Cron('0 * * * *') // Jalankan setiap jam (bukan hanya jam 7)
async checkDueDateReminders() {
  const currentHour = new Date().getHours();

  // Cari semua user yang jam remindernya adalah jam sekarang
  // dan yang notifikasinya aktif
  const usersWithReminderNow = await this.prisma.user.findMany({
    where: {
      is_active: true,
      OR: [
        // User yang punya preferensi custom dengan jam yang cocok
        {
          notification_preference: {
            reminder_hour: currentHour,
            email_notifications_enabled: true,
          }
        },
        // User yang belum set preferensi (gunakan default jam 7)
        {
          notification_preference: null,
          // Hanya jalankan di jam 7 untuk user tanpa preferensi
          ...(currentHour === 7 ? {} : { id: 'impossible-id' })
        }
      ]
    },
    include: {
      notification_preference: true,
    }
  });

  // Untuk setiap user, cek project yang mendekati deadline mereka
  for (const user of usersWithReminderNow) {
    const daysBefore = user.notification_preference?.reminder_days_before ?? 3;
    const targetDate = addDays(new Date(), daysBefore);

    const upcomingProjects = await this.prisma.project.findMany({
      where: {
        pic_user_id : user.id,
        deleted_at  : null,
        status      : { notIn: ['FINISHED', 'CANCELLED'] },
        due_date    : {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        }
      }
    });

    // Buat notifikasi untuk setiap project yang ditemukan
    for (const project of upcomingProjects) {
      await this.notificationsService.createDueDateReminder(user.id, project);
    }
  }
}
```

Tambahkan endpoint di `users.controller.ts` untuk membaca dan memperbarui preferensi:

```typescript
// Endpoint baru di users.controller.ts

@Get('preferences/notifications')
getNotificationPreferences(@CurrentUser() user: User) {
  return this.usersService.getNotificationPreferences(user.id);
}

@Patch('preferences/notifications')
updateNotificationPreferences(
  @CurrentUser() user: User,
  @Body() dto: UpdateNotificationPreferenceDto
) {
  return this.usersService.updateNotificationPreferences(user.id, dto);
}
```

DTO untuk update preferensi:

```typescript
// update-notification-preference.dto.ts
import { IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Minimal 1 hari sebelum deadline' })
  @Max(30, { message: 'Maksimal 30 hari sebelum deadline' })
  reminder_days_before?: number;

  @IsOptional()
  @IsBoolean()
  email_notifications_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  reminder_hour?: number;

  @IsOptional()
  @IsBoolean()
  weekly_digest_enabled?: boolean;
}
```

### Perubahan Frontend

Tambahkan section "Preferensi Notifikasi" di halaman `ProfilePage.tsx`. Tampilan yang paling intuitif adalah menggunakan kombinasi slider (untuk `reminder_days_before`) dan toggle switch (untuk pilihan enable/disable):

```tsx
// Bagian dari ProfilePage.tsx

const NotificationPreferencesCard = () => {
  const { preferences, updatePreferences } = useNotificationPreferences();

  return (
    <Card title="Preferensi Notifikasi">
      <div className="space-y-6">
        <div>
          <label className="font-medium text-gray-700">
            Ingatkan saya berapa hari sebelum deadline
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Saat ini disetel: H-{preferences?.reminder_days_before ?? 3}
          </p>
          {/* Ant Design Slider */}
          <Slider
            min={1} max={14}
            value={preferences?.reminder_days_before ?? 3}
            marks={{ 1: 'H-1', 3: 'H-3', 7: 'H-7', 14: 'H-14' }}
            onChange={(val) => updatePreferences({ reminder_days_before: val })}
          />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-gray-700">Notifikasi Email</p>
            <p className="text-sm text-gray-500">
              Kirim reminder ke {currentUser.email}
            </p>
          </div>
          <Switch
            checked={preferences?.email_notifications_enabled ?? true}
            onChange={(val) =>
              updatePreferences({ email_notifications_enabled: val })}
          />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-gray-700">Weekly Digest</p>
            <p className="text-sm text-gray-500">
              Ringkasan mingguan setiap Jumat sore
            </p>
          </div>
          <Switch
            checked={preferences?.weekly_digest_enabled ?? false}
            onChange={(val) =>
              updatePreferences({ weekly_digest_enabled: val })}
          />
        </div>
      </div>
    </Card>
  );
};
```

---

## Urutan Implementasi yang Disarankan

Meskipun ketiga fitur ini bisa dikerjakan secara paralel oleh developer yang berbeda, jika dikerjakan secara serial, urutan yang paling efisien adalah sebagai berikut.

**Minggu pertama** fokus pada Activity Log karena meskipun tampilannya di frontend sederhana, dampak teknis dari Prisma middleware-nya paling luas — begitu middleware dipasang, seluruh sistem sudah "tercatat" secara otomatis. Ini juga memberikan data histori yang berguna untuk debugging pengembangan fitur-fitur berikutnya.

**Minggu kedua** fokus pada Komentar karena ini adalah fitur yang paling berdampak pada kolaborasi tim. Setelah modul komentar selesai, test dengan menggunakan skenario nyata: minta Staff membuat project, Kabid memberi komentar, dan Staff membalasnya — pastikan notifikasi terkirim dengan benar.

**Minggu ketiga** fokus pada Preferensi Notifikasi, karena ini adalah "penyempurnaan" dari sistem yang sudah ada. Tidak ada risiko breaking change yang besar di sini — scheduler yang ada tetap berjalan dengan nilai default jika user belum mengatur preferensinya.
