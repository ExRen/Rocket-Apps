# 📊 Update Kelompok 4 — Fitur Analitik Lanjutan
### Aplikasi ROCKET | PT ASABRI (Persero)
> **Prioritas:** Strategis — Dikerjakan setelah sistem berjalan minimal 6 bulan
> **Estimasi Total:** 6–8 minggu pengerjaan
> **Dampak:** Mengangkat ROCKET dari alat operasional menjadi sumber intelijen bisnis

---

## Mengapa Kelompok Ini Memerlukan Waktu Paling Lama untuk Dimulai

Ada satu hal yang membuat kelompok ini benar-benar berbeda dari tiga kelompok sebelumnya, dan ini penting untuk dipahami sejak awal agar ekspektasi semua pihak terkelola dengan baik. Fitur-fitur di kelompok ini memerlukan **data historis yang cukup banyak dan berkualitas** untuk bisa memberikan nilai yang bermakna.

Bayangkan Anda diminta memprediksi kemacetan lalu lintas di Jakarta menggunakan data dari dua hari terakhir — hasilnya tidak akan bisa dipercaya. Tetapi dengan data 6 bulan yang mencakup berbagai kondisi (hari kerja, libur, musim hujan, event khusus), prediksinya akan jauh lebih akurat. Logika yang sama berlaku di sini: Early Warning System yang memprediksi keterlambatan project memerlukan data dari puluhan atau ratusan project yang sudah selesai untuk menemukan pola yang bermakna.

Ini bukan kelemahan dari fitur ini — justru ini adalah tanda bahwa fitur ini betul-betul dirancang untuk memberikan nilai yang substansial, bukan sekadar terlihat canggih.

---

## Daftar Isi

1. [Fitur 4.1 — Prediksi Keterlambatan (Early Warning System)](#fitur-41--prediksi-keterlambatan-early-warning-system)
2. [Fitur 4.2 — Dashboard Eksekutif](#fitur-42--dashboard-eksekutif)
3. [Urutan Implementasi yang Disarankan](#urutan-implementasi-yang-disarankan)

---

## Fitur 4.1 — Prediksi Keterlambatan (Early Warning System)

### Latar Belakang & Nilai Bisnis

Salah satu frustrasi terbesar dalam manajemen project adalah **mengetahui bahwa sebuah project akan terlambat hanya ketika sudah terlambat**. Pada titik itu, ruang untuk intervensi sudah sangat terbatas. Early Warning System membalik dinamika ini: sistem memberikan sinyal peringatan beberapa minggu sebelum keterlambatan terjadi, ketika masih ada cukup waktu untuk mengambil tindakan korektif.

Pendekatan yang dipilih sengaja menghindari istilah "machine learning" atau "AI" yang bisa menimbulkan ekspektasi berlebihan dan kompleksitas implementasi yang tidak perlu. Sebaliknya, kita menggunakan **analisis statistik berbasis aturan** yang dibangun di atas pemahaman bisnis yang kuat. Hasilnya lebih mudah dijelaskan kepada pengguna ("project ini diberi tanda merah karena sudah 2 minggu tanpa update"), lebih mudah di-debug ketika ada kesalahan, dan seringkali tidak kalah akurat dengan model machine learning untuk dataset sekecil ini.

### Cara Kerja Sistem Prediksi

Sistem menghitung **Risk Score** untuk setiap project aktif, sebuah angka antara 0 (tidak berisiko) hingga 100 (sangat berisiko terlambat). Skor ini dihitung berdasarkan kombinasi beberapa faktor risiko:

**Faktor pertama: Stagnasi Progress (bobot 35%)** — Seberapa lama project ini tidak mendapat update notes? Project yang sudah 10 hari tanpa perubahan apapun di field `update_notes` mendapat skor stagnasi yang tinggi. Ini adalah sinyal paling kuat karena menunjukkan bahwa tidak ada pekerjaan nyata yang sedang terjadi.

**Faktor kedua: Riwayat Reschedule PIC (bobot 25%)** — Berapa persen project milik PIC ini yang pernah mengalami rescheduled di masa lalu? Jika seorang Staff secara historis sering menggeser deadline, project barunya secara statistik lebih berisiko mengalami hal yang sama. Ini bukan penilaian terhadap karakter individu — ini adalah pola kerja yang mungkin disebabkan oleh overloading atau faktor eksternal yang konsisten.

**Faktor ketiga: Kompleksitas Project (bobot 20%)** — Berapa banyak sub-project yang belum selesai dibandingkan total sub-project? Project dengan 8 sub-project dan 7 di antaranya masih berstatus `TO_DO_NEXT` ketika due date tinggal 1 minggu lagi adalah project yang berisiko tinggi.

**Faktor keempat: Sisa Waktu vs Estimasi Historis (bobot 20%)** — Rata-rata berapa hari project sejenis (berdasarkan klien dan kategori serupa) diselesaikan dari pertama dibuat hingga finished? Jika rata-rata historisnya adalah 14 hari tetapi project ini sudah berjalan 20 hari dan belum selesai, ini adalah sinyal yang signifikan.

### Perubahan Database

Tambahkan dua tabel baru: satu untuk menyimpan risk score yang dihitung secara berkala, dan satu untuk menyimpan statistik historis yang menjadi basis kalkulasi:

```prisma
model ProjectRiskScore {
  id          String   @id @default(uuid())
  project_id  String   @unique  // Satu project hanya memiliki satu risk score aktif
  project     Project  @relation(fields: [project_id], references: [id], onDelete: Cascade)

  // Skor keseluruhan (0-100)
  risk_score  Float

  // Breakdown skor per faktor untuk transparansi
  // (ditampilkan di UI agar pengguna mengerti mengapa project ini berisiko)
  stagnation_score    Float  // Skor stagnasi progress (0-100)
  pic_history_score   Float  // Skor riwayat PIC (0-100)
  complexity_score    Float  // Skor kompleksitas sub-project (0-100)
  timeline_score      Float  // Skor perbandingan timeline (0-100)

  // Label risiko berdasarkan skor total
  risk_level  String  // "LOW", "MEDIUM", "HIGH", "CRITICAL"

  // Kapan skor ini dihitung (di-refresh setiap hari oleh scheduler)
  calculated_at DateTime @default(now())

  @@index([risk_score])  // Untuk sorting by risk score
  @@map("project_risk_scores")
}

// Statistik historis per PIC — di-update setiap kali project selesai
model PicHistoricalStats {
  id                      String @id @default(uuid())
  user_id                 String @unique
  user                    User   @relation(fields: [user_id], references: [id])

  total_completed         Int    @default(0)  // Total project yang selesai
  total_rescheduled       Int    @default(0)  // Total yang pernah rescheduled
  avg_completion_days     Float  @default(0)  // Rata-rata hari penyelesaian
  reschedule_rate         Float  @default(0)  // Persentase yang rescheduled

  last_updated            DateTime @default(now())

  @@map("pic_historical_stats")
}
```

Tambahkan relasi di model yang relevan:

```prisma
// Di model Project:
risk_score ProjectRiskScore?

// Di model User:
historical_stats PicHistoricalStats?
```

### Perubahan Backend

Buat service `risk-analysis.service.ts` yang berisi seluruh logika kalkulasi risk score:

```typescript
// risk-analysis.service.ts

@Injectable()
export class RiskAnalysisService {
  constructor(private prisma: PrismaService) {}

  // Dipanggil oleh scheduler setiap hari — hitung ulang semua risk score
  async recalculateAllRiskScores() {
    const activeProjects = await this.prisma.project.findMany({
      where: {
        deleted_at: null,
        status    : { in: ['ON_GOING', 'TO_DO_NEXT', 'NEED_FOLLOW_UP', 'REVISI'] },
        due_date  : { gte: new Date() }, // Hanya project yang belum melewati due date
      },
      include: {
        sub_projects   : true,
        pic            : { include: { historical_stats: true } },
        // Activity log dari Kelompok 1 digunakan di sini!
        activity_logs  : {
          where     : { entity_type: 'Project' },
          orderBy   : { created_at: 'desc' },
          take      : 1,  // Hanya butuh log terakhir untuk cek stagnasi
        }
      }
    });

    for (const project of activeProjects) {
      const scores = this.calculateScores(project);
      const totalScore = this.weightedAverage(scores);
      const riskLevel = this.getRiskLevel(totalScore);

      await this.prisma.projectRiskScore.upsert({
        where : { project_id: project.id },
        update: {
          risk_score       : totalScore,
          stagnation_score : scores.stagnation,
          pic_history_score: scores.pic_history,
          complexity_score : scores.complexity,
          timeline_score   : scores.timeline,
          risk_level       : riskLevel,
          calculated_at    : new Date(),
        },
        create: {
          project_id       : project.id,
          risk_score       : totalScore,
          stagnation_score : scores.stagnation,
          pic_history_score: scores.pic_history,
          complexity_score : scores.complexity,
          timeline_score   : scores.timeline,
          risk_level       : riskLevel,
        }
      });

      // Kirim notifikasi jika project baru masuk kategori HIGH atau CRITICAL
      // dan belum pernah dikirim notifikasi untuk risk level ini sebelumnya
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.notifyRiskEscalation(project, riskLevel);
      }
    }
  }

  private calculateScores(project: any) {
    // ---- Faktor 1: Stagnasi Progress ----
    // Cek kapan terakhir kali ada update di project ini
    const lastActivity = project.activity_logs[0];
    const daysSinceUpdate = lastActivity
      ? differenceInDays(new Date(), new Date(lastActivity.created_at))
      : differenceInDays(new Date(), new Date(project.created_at));
    // Skor 0 jika update hari ini, skor 100 jika lebih dari 14 hari
    const stagnation = Math.min((daysSinceUpdate / 14) * 100, 100);

    // ---- Faktor 2: Riwayat PIC ----
    // Gunakan reschedule_rate dari statistik historis PIC
    const picStats = project.pic.historical_stats;
    const pic_history = picStats ? (picStats.reschedule_rate * 100) : 20; // Default 20 jika belum ada data

    // ---- Faktor 3: Kompleksitas Sub-Project ----
    const totalSubs = project.sub_projects.length;
    if (totalSubs === 0) {
      // Tidak ada sub project, tidak ada faktor kompleksitas
      var complexity = 0;
    } else {
      const incompleteSubs = project.sub_projects.filter(
        s => s.status !== 'FINISHED' && s.status !== 'CANCELLED'
      ).length;
      const daysUntilDue = differenceInDays(new Date(project.due_date), new Date());
      // Semakin banyak sub project belum selesai dengan sisa waktu makin sedikit, makin tinggi skor
      const incompleteRatio = incompleteSubs / totalSubs;
      const urgencyFactor = daysUntilDue <= 0 ? 1 : Math.max(0, 1 - (daysUntilDue / 30));
      var complexity = incompleteRatio * urgencyFactor * 100;
    }

    // ---- Faktor 4: Timeline vs Historis ----
    const avgHistorical = picStats?.avg_completion_days || 30; // Default 30 hari
    const daysElapsed = differenceInDays(new Date(), new Date(project.created_at));
    const daysUntilDue = differenceInDays(new Date(project.due_date), new Date());

    // Jika waktu yang sudah berlalu sudah melebihi rata-rata historis, skor meningkat
    const timeline = daysElapsed > avgHistorical
      ? Math.min(((daysElapsed - avgHistorical) / avgHistorical) * 100, 100)
      : 0;

    return { stagnation, pic_history, complexity, timeline };
  }

  private weightedAverage(scores: Record<string, number>): number {
    // Bobot sesuai penjelasan di bagian "Cara Kerja" di atas
    return (
      scores.stagnation  * 0.35 +
      scores.pic_history * 0.25 +
      scores.complexity  * 0.20 +
      scores.timeline    * 0.20
    );
  }

  private getRiskLevel(score: number): string {
    if (score >= 75) return 'CRITICAL';  // Merah — perlu intervensi segera
    if (score >= 50) return 'HIGH';      // Oranye — perlu perhatian
    if (score >= 25) return 'MEDIUM';    // Kuning — perlu dipantau
    return 'LOW';                        // Hijau — aman
  }

  // Update statistik historis PIC setiap kali project selesai
  // Dipanggil oleh ReviewService saat project di-approve
  async updatePicStats(userId: string) {
    const completedProjects = await this.prisma.project.findMany({
      where  : { pic_user_id: userId, status: 'FINISHED', deleted_at: null },
    });

    const rescheduledCount = completedProjects.filter(p =>
      // Cek apakah ada activity log yang mencatat perubahan ke status RESCHEDULED
      true // Implementasi detail menggunakan activity logs dari Kelompok 1
    ).length;

    const avgDays = completedProjects.reduce((sum, p) => {
      return sum + differenceInDays(new Date(p.updated_at), new Date(p.created_at));
    }, 0) / (completedProjects.length || 1);

    await this.prisma.picHistoricalStats.upsert({
      where : { user_id: userId },
      update: {
        total_completed    : completedProjects.length,
        total_rescheduled  : rescheduledCount,
        avg_completion_days: avgDays,
        reschedule_rate    : completedProjects.length > 0
                             ? rescheduledCount / completedProjects.length : 0,
        last_updated       : new Date(),
      },
      create: {
        user_id            : userId,
        total_completed    : completedProjects.length,
        total_rescheduled  : rescheduledCount,
        avg_completion_days: avgDays,
        reschedule_rate    : completedProjects.length > 0
                             ? rescheduledCount / completedProjects.length : 0,
      }
    });
  }
}
```

Tambahkan cron job untuk menjalankan kalkulasi setiap malam:

```typescript
// Di scheduler.service.ts — cron job baru
@Cron('0 2 * * *')  // Setiap hari jam 02.00 dini hari (saat traffic rendah)
async recalculateRiskScores() {
  this.logger.log('Recalculating project risk scores...');
  await this.riskAnalysisService.recalculateAllRiskScores();
  this.logger.log('Risk score calculation complete.');
}
```

Tambahkan endpoint untuk mengakses data risiko:

```typescript
// Di projects.controller.ts — tambahkan endpoint ini

// Ambil daftar project dengan risk score yang tinggi (untuk Kabid/Sesper)
@Get('at-risk')
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
getAtRiskProjects(@Query('min_level') minLevel: string = 'HIGH') {
  return this.projectsService.getAtRiskProjects(minLevel);
}
```

### Perubahan Frontend

Risk score diintegrasikan ke dalam tampilan yang **sudah ada** di dua tempat, bukan membuat halaman baru yang terpisah. Pendekatan ini jauh lebih efektif karena pengguna melihat informasi risiko tepat di konteks yang relevan, bukan harus berpindah halaman untuk mencarinya.

**Integrasi pertama di Tabel Working Tracker:** Tambahkan kolom "Risiko" yang menampilkan badge dengan label LOW, MEDIUM, HIGH, atau CRITICAL dengan warna yang sesuai. Badge ini juga memiliki tooltip yang muncul saat hover, menampilkan breakdown singkat mengapa project ini mendapat skor tersebut — misalnya "Tidak ada update selama 8 hari" atau "PIC memiliki tingkat reschedule 60%". Transparansi ini penting agar pengguna tidak merasa sistem menilai mereka secara arbiter.

**Integrasi kedua di Dashboard:** Tambahkan widget baru "Project Berisiko Tinggi" di bawah widget TOP 5 Due Date yang sudah ada. Widget ini menampilkan 3 project dengan risk score tertinggi, lengkap dengan skor dan faktor utama yang menyebabkannya berisiko.

```tsx
// Komponen RiskBadge yang dipakai di tabel Working Tracker
const RiskBadge = ({ riskScore }) => {
  if (!riskScore) return null;

  const config = {
    LOW     : { color: 'green',  label: 'Rendah'  },
    MEDIUM  : { color: 'gold',   label: 'Sedang'  },
    HIGH    : { color: 'orange', label: 'Tinggi'  },
    CRITICAL: { color: 'red',    label: 'Kritis'  },
  };

  const { color, label } = config[riskScore.risk_level] || config.LOW;

  // Tooltip menampilkan breakdown faktor risiko
  const tooltipContent = (
    <div className="text-xs space-y-1">
      <p>Skor Risiko: {Math.round(riskScore.risk_score)}/100</p>
      <p>Stagnasi progress: {Math.round(riskScore.stagnation_score)}/100</p>
      <p>Riwayat PIC: {Math.round(riskScore.pic_history_score)}/100</p>
      <p>Kompleksitas: {Math.round(riskScore.complexity_score)}/100</p>
      <p>Timeline: {Math.round(riskScore.timeline_score)}/100</p>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="left">
      <Tag color={color} className="cursor-help">{label}</Tag>
    </Tooltip>
  );
};
```

---

## Fitur 4.2 — Dashboard Eksekutif

### Latar Belakang & Nilai Bisnis

Ada perbedaan mendasar antara pengguna operasional dan pengguna eksekutif dalam cara mereka mengonsumsi informasi. Pengguna operasional — Staff, Kabid — membutuhkan detail, bisa men-drill-down, dan berinteraksi dengan data. Pengguna eksekutif — Kepala Divisi, Direktur — membutuhkan **ringkasan 30 detik** yang langsung menjawab pertanyaan kunci: apakah target berjalan sesuai rencana, dan di mana yang perlu mendapat perhatian?

Dashboard Eksekutif dirancang khusus untuk kebutuhan ini. Ia tidak memerlukan login yang kompleks, bisa ditampilkan di layar besar di ruang meeting, dan bisa dibagikan sebagai tautan hanya-baca kepada siapapun yang perlu tahu tanpa memberi mereka akses penuh ke sistem.

### Perubahan Database

Tambahkan tabel untuk menyimpan **token akses dashboard eksekutif** yang bersifat read-only. Token ini tidak terkait dengan akun pengguna manapun — ia adalah kunci tersendiri yang bisa dibuat dan dicabut kapanpun oleh Super User:

```prisma
model ExecDashboardToken {
  id          String    @id @default(uuid())
  token       String    @unique @default(uuid())  // Token unik yang disertakan di URL
  label       String    // Nama deskriptif, contoh: "Token untuk Rapat Direksi Q2 2025"
  is_active   Boolean   @default(true)
  expires_at  DateTime? // Opsional — null berarti tidak ada kedaluwarsa

  created_by_id String
  created_by    User   @relation(fields: [created_by_id], references: [id])
  created_at    DateTime @default(now())

  @@map("exec_dashboard_tokens")
}
```

### Perubahan Backend

Tambahkan endpoint khusus yang tidak memerlukan JWT tetapi memerlukan token eksekutif di query parameter:

```typescript
// exec-dashboard.controller.ts

@Controller('exec-dashboard')
export class ExecDashboardController {

  // Endpoint yang diakses tanpa JWT — menggunakan token khusus di URL
  // Contoh URL: https://rocket.asabri.co.id/exec?token=abc123
  @Get()
  @UseGuards(ExecDashboardTokenGuard)  // Guard khusus yang validasi token eksekutif
  getDashboard(@Query('token') token: string) {
    return this.execDashboardService.getExecDashboard();
  }
}
```

Guard khusus untuk token eksekutif:

```typescript
// exec-dashboard-token.guard.ts

@Injectable()
export class ExecDashboardTokenGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.query.token;

    if (!token) return false;

    const tokenRecord = await this.prisma.execDashboardToken.findUnique({
      where: { token, is_active: true }
    });

    if (!tokenRecord) return false;

    // Cek apakah token sudah kadaluarsa
    if (tokenRecord.expires_at && new Date() > tokenRecord.expires_at) {
      return false;
    }

    return true;
  }
}
```

Service khusus yang menghasilkan data dashboard eksekutif — lebih ringkas dan lebih tinggi level abstraksinya dibandingkan dashboard operasional:

```typescript
// exec-dashboard.service.ts

async getExecDashboard() {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [
    completionRate,
    overdueCount,
    budgetSummary,
    atRiskProjects,
    monthlyTrend,
  ] = await Promise.all([

    // Tingkat penyelesaian project bulan ini vs total project aktif
    this.getCompletionRate(currentYear, currentMonth),

    // Jumlah project yang sudah melewati due date dan belum selesai
    this.prisma.project.count({
      where: {
        due_date  : { lt: new Date() },
        status    : { notIn: ['FINISHED', 'CANCELLED'] },
        deleted_at: null,
      }
    }),

    // Ringkasan total anggaran vs total terserap tahun ini
    this.getBudgetSummary(currentYear),

    // 5 project paling berisiko (dari Early Warning System)
    this.prisma.projectRiskScore.findMany({
      where  : { risk_level: { in: ['HIGH', 'CRITICAL'] } },
      include: { project: { include: { pic: { select: { full_name: true } } } } },
      orderBy: { risk_score: 'desc' },
      take   : 5,
    }),

    // Tren penyelesaian project per bulan (6 bulan terakhir)
    this.getMonthlyCompletionTrend(6),
  ]);

  return {
    meta: {
      period     : `${getMonthName(currentMonth)} ${currentYear}`,
      generated_at: new Date(),
    },
    kpi: {
      completion_rate: completionRate,   // Persentase project selesai tepat waktu
      overdue_count  : overdueCount,     // Jumlah project terlambat
      budget_absorption: budgetSummary,  // Persentase serapan anggaran
    },
    at_risk_projects: atRiskProjects,
    monthly_trend   : monthlyTrend,
  };
}

private async getCompletionRate(year: number, month: number) {
  const totalThisMonth = await this.prisma.project.count({
    where: { month, year, deleted_at: null }
  });
  const finishedThisMonth = await this.prisma.project.count({
    where: { month, year, status: 'FINISHED', deleted_at: null }
  });
  return {
    total   : totalThisMonth,
    finished: finishedThisMonth,
    rate    : totalThisMonth > 0
              ? Math.round((finishedThisMonth / totalThisMonth) * 100)
              : 0,
  };
}
```

Tambahkan juga CRUD endpoint untuk mengelola token eksekutif (hanya Super User):

```typescript
// Di settings atau exec-dashboard controller:
@Post('tokens')
@Roles(UserRole.SUPER_USER)
createToken(@Body() dto: CreateExecTokenDto, @CurrentUser() user: User) {
  return this.execDashboardService.createToken(dto, user.id);
}

@Get('tokens')
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
getTokens() {
  return this.execDashboardService.getAllTokens();
}

@Delete('tokens/:id')
@Roles(UserRole.SUPER_USER)
revokeToken(@Param('id') id: string) {
  return this.execDashboardService.revokeToken(id);
}
```

### Perubahan Frontend

Dashboard Eksekutif memerlukan **dua halaman yang berbeda**: satu halaman pengelolaan token di dalam aplikasi utama (untuk Super User), dan satu halaman dashboard yang bisa diakses tanpa login (untuk pimpinan).

**Halaman pengelolaan token** ditambahkan di Settings, hanya terlihat untuk Super User. Halaman ini menampilkan tabel semua token yang pernah dibuat (dengan label, tanggal dibuat, dan status aktif/tidak aktif), dan tombol untuk membuat token baru atau mencabut token yang ada. Ketika token baru dibuat, sistem menampilkan URL lengkap yang bisa langsung disalin: `https://rocket.asabri.co.id/exec?token=abc123...`.

**Halaman dashboard eksekutif** berada di route `/exec` yang tidak dilindungi oleh Route Guard autentikasi biasa, melainkan hanya memverifikasi keberadaan query parameter `token`. Halaman ini dirancang dengan filosofi "less is more" — tidak ada navigasi, tidak ada sidebar, tidak ada tombol interaksi yang kompleks. Hanya angka-angka kunci yang dirender besar dan jelas:

```tsx
// ExecDashboardPage.tsx — halaman standalone yang berbeda dari AppLayout biasa

const ExecDashboardPage = () => {
  const { token } = useSearchParams();
  const { data, isLoading, isError } = useExecDashboard(token);

  if (isError) return <ExecDashboardErrorPage />;

  return (
    // Tidak menggunakan AppLayout karena tidak perlu Sidebar dan Navbar
    <div className="min-h-screen bg-asabri-blue p-8">

      {/* Header dengan logo ASABRI dan periode laporan */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img src="/logo-asabri.png" alt="ASABRI" className="h-12" />
          <div>
            <h1 className="text-white text-2xl font-bold">ROCKET Dashboard</h1>
            <p className="text-blue-300 text-sm">
              Laporan Eksekutif — {data?.meta.period}
            </p>
          </div>
        </div>
        <p className="text-blue-300 text-xs">
          Diperbarui: {formatRelativeTime(data?.meta.generated_at)}
        </p>
      </div>

      {/* KPI Cards — tiga angka utama yang paling penting */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <KpiCard
          title="Tingkat Penyelesaian"
          value={`${data?.kpi.completion_rate.rate}%`}
          subtitle={`${data?.kpi.completion_rate.finished} dari ${data?.kpi.completion_rate.total} project`}
          icon="✅"
          color={data?.kpi.completion_rate.rate >= 70 ? 'green' : 'orange'}
        />
        <KpiCard
          title="Project Terlambat"
          value={data?.kpi.overdue_count}
          subtitle="Perlu tindakan segera"
          icon="⚠️"
          color={data?.kpi.overdue_count === 0 ? 'green' : 'red'}
        />
        <KpiCard
          title="Serapan Anggaran"
          value={`${Math.round(data?.kpi.budget_absorption.total_rate)}%`}
          subtitle="Dari total anggaran RKAP"
          icon="💰"
          color="blue"
        />
      </div>

      {/* Dua panel bawah: tren bulanan dan project berisiko */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/10 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Tren Penyelesaian (6 Bulan)</h2>
          {/* Line chart sederhana — persentase penyelesaian per bulan */}
          <ExecTrendChart data={data?.monthly_trend} />
        </div>

        <div className="bg-white/10 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Project Berisiko Tinggi</h2>
          {data?.at_risk_projects.map(item => (
            <div key={item.id}
                 className="flex justify-between items-center py-2
                            border-b border-white/20 last:border-0">
              <div>
                <p className="text-white text-sm font-medium line-clamp-1">
                  {item.project.name}
                </p>
                <p className="text-blue-300 text-xs">{item.project.pic.full_name}</p>
              </div>
              <Tag color={item.risk_level === 'CRITICAL' ? 'red' : 'orange'}>
                {item.risk_level === 'CRITICAL' ? 'Kritis' : 'Tinggi'}
              </Tag>
            </div>
          ))}
          {data?.at_risk_projects.length === 0 && (
            <p className="text-blue-300 text-sm text-center py-4">
              ✅ Tidak ada project berisiko tinggi saat ini
            </p>
          )}
        </div>
      </div>

    </div>
  );
};
```

Halaman ini juga bisa dirender sebagai PDF berkualitas tinggi menggunakan Puppeteer di backend, sehingga bisa dicetak atau dilampirkan di laporan rapat.

---

## Urutan Implementasi yang Disarankan

Urutan di kelompok ini lebih mudah ditentukan karena ada satu dependensi yang jelas: Early Warning System memerlukan data dari Activity Log (Kelompok 1) untuk mendeteksi stagnasi, dan memerlukan data historis project yang sudah diselesaikan untuk menghitung statistik PIC. Oleh karena itu, **Early Warning System harus dikerjakan setelah sistem sudah berjalan dan mengumpulkan data selama minimal 6 bulan**.

Sebaliknya, **Dashboard Eksekutif bisa dikerjakan lebih awal** — bahkan bersamaan dengan Kelompok 3 jika ada kebutuhan dari manajemen yang mendesak. Data yang ditampilkan (tingkat penyelesaian, jumlah project terlambat, serapan anggaran) sudah tersedia sejak hari pertama sistem berjalan. Kualitas datanya memang akan lebih bermakna setelah beberapa bulan, namun tidak ada hambatan teknis untuk meluncurkannya lebih awal.

Dengan demikian, urutan yang ideal untuk Kelompok 4 adalah: mulai dengan **Dashboard Eksekutif** segera setelah Kelompok 3 selesai, sambil membiarkan data terakumulasi. Kemudian setelah 6 bulan penuh, kerjakan **Early Warning System** dengan basis data yang sudah kaya dan bermakna. Pada titik ini, ROCKET telah bertransformasi dari sebuah aplikasi working tracker menjadi platform intelijen operasional yang sesungguhnya bagi PT ASABRI.
