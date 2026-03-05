# 🔗 Update Kelompok 7 — Integrasi Ekosistem ASABRI
### Aplikasi ROCKET | PT ASABRI (Persero)
> **Prioritas:** Menengah — Dikerjakan setelah Kelompok 6 stabil, koordinasi intensif dengan IT ASABRI
> **Estimasi Total:** 7–10 minggu pengerjaan (termasuk koordinasi eksternal)
> **Dampak:** Mengangkat ROCKET dari sistem terisolasi menjadi bagian dari ekosistem digital ASABRI

---

## Filosofi Kelompok Ini

Ada sebuah metafora yang sangat tepat untuk menggambarkan posisi ROCKET saat ini dan ke mana kelompok ini akan membawanya. Bayangkan ROCKET sebagai sebuah perpustakaan yang sangat bagus — koleksinya lengkap, sistemnya terorganisir, dan pengelolaannya profesional. Namun perpustakaan ini berdiri sendiri di sebuah pulau. Untuk mengaksesnya, setiap orang harus menyeberang dengan perahu. Kelompok 7 adalah tentang membangun jembatan — menghubungkan pulau ini ke daratan (ekosistem digital ASABRI yang lebih luas), sehingga nilai perpustakaan itu bisa dinikmati dan dikontribusikan secara jauh lebih luas.

Yang perlu dipahami dengan baik sebelum memulai kelompok ini adalah bahwa integrasi sistem bukan sekadar tantangan teknis — ia juga tantangan **organisasional dan manajerial**. Menghubungkan ROCKET dengan sistem lain di ASABRI memerlukan persetujuan, koordinasi, dan seringkali negosiasi dengan tim yang mengelola sistem-sistem tersebut. Estimasi waktu yang lebih panjang di kelompok ini sebagian besar disebabkan oleh koordinasi ini, bukan kompleksitas teknis semata.

---

## Daftar Isi

1. [Fitur 7.1 — Sinkronisasi Active Directory Dua Arah](#fitur-71--sinkronisasi-active-directory-dua-arah)
2. [Fitur 7.2 — Open API & Outbound Webhooks](#fitur-72--open-api--outbound-webhooks)
3. [Fitur 7.3 — Modul Audit & Compliance Khusus BUMN](#fitur-73--modul-audit--compliance-khusus-bumn)
4. [Urutan Implementasi yang Disarankan](#urutan-implementasi-yang-disarankan)

---

## Fitur 7.1 — Sinkronisasi Active Directory Dua Arah

### Latar Belakang & Nilai Bisnis

Integrasi LDAP yang ada saat ini bekerja dengan pola yang disebut **pull on-demand** — ROCKET hanya menghubungi Active Directory ketika seseorang sedang login, dan hanya mengambil data profil orang tersebut. Ini adalah pola yang tepat untuk autentikasi, tetapi ia tidak menangani skenario yang sangat umum terjadi: perubahan data karyawan yang terjadi di antara sesi login.

Bayangkan skenario konkret berikut. Seorang Staff bernama Andris dipromosikan menjadi Kepala Bidang Baru. Di Active Directory, atribut group membership-nya sudah diubah oleh tim IT. Namun di ROCKET, Andris masih berstatus sebagai Level 3 sampai Super User secara manual mengubah role-nya. Selama jeda waktu ini, Andris tidak bisa melakukan review yang seharusnya menjadi tanggung jawab barunya.

Sinkronisasi dua arah menyelesaikan jeda ini dengan dua mekanisme yang bekerja bersama. Mekanisme pertama adalah **scheduled sync** — setiap malam, ROCKET menanyakan kepada AD "siapa saja yang berubah sejak kemarin?" dan memperbarui data lokal sesuai jawabannya. Mekanisme kedua adalah **mapping grup AD ke role ROCKET** — alih-alih role dikelola secara manual di ROCKET, ia dipetakan secara otomatis dari keanggotaan grup di AD. Jika karyawan masuk ke grup `ROCKET_KABID` di AD, role mereka di ROCKET otomatis menjadi Level 2.

### Perubahan Database

Tambahkan tabel konfigurasi mapping antara grup AD dan role ROCKET, serta tabel log sinkronisasi:

```prisma
// Mapping antara grup Active Directory dan role di ROCKET
// Dikonfigurasi sekali oleh Super User, kemudian digunakan otomatis oleh sync job
model AdGroupRoleMapping {
  id         String   @id @default(uuid())
  ad_group   String   @unique  // Distinguished Name grup di AD
                               // Contoh: "CN=ROCKET_KABID,OU=Groups,DC=asabri,DC=co,DC=id"
  rocket_role UserRole          // Role yang akan diberikan ke anggota grup ini
  description String?           // Penjelasan, contoh: "Grup untuk Kepala Bidang Kompro"
  is_active  Boolean  @default(true)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("ad_group_role_mappings")
}

// Log setiap operasi sinkronisasi — berguna untuk debugging dan audit
model AdSyncLog {
  id               String   @id @default(uuid())
  sync_type        String   // "SCHEDULED" atau "MANUAL"
  started_at       DateTime
  completed_at     DateTime?

  // Statistik hasil sync
  users_created    Int @default(0)  // User baru yang ditambahkan
  users_updated    Int @default(0)  // User yang datanya berubah
  users_deactivated Int @default(0) // User yang dinonaktifkan

  status           String   // "SUCCESS", "PARTIAL", atau "FAILED"
  error_details    String?  @db.Text  // Detail error jika ada

  @@map("ad_sync_logs")
}
```

### Perubahan Backend

Buat service `AdSyncService` yang mengelola seluruh proses sinkronisasi. Service ini jauh lebih kompleks dari `LdapService` yang sudah ada karena ia perlu melakukan operasi batch dan menangani berbagai skenario perubahan:

```typescript
// ad-sync.service.ts

@Injectable()
export class AdSyncService {
  private readonly logger = new Logger(AdSyncService.name);

  constructor(
    private prisma      : PrismaService,
    private ldapService : LdapService,
  ) {}

  // Entry point utama — dipanggil oleh cron job setiap malam
  async runScheduledSync(): Promise<AdSyncLog> {
    const syncLog = await this.prisma.adSyncLog.create({
      data: { sync_type: 'SCHEDULED', started_at: new Date(), status: 'IN_PROGRESS' }
    });

    const stats = { created: 0, updated: 0, deactivated: 0 };

    try {
      // Langkah 1: Ambil semua user aktif dari Active Directory
      const adUsers = await this.ldapService.getAllUsers();

      // Langkah 2: Ambil semua user aktif yang ada di database ROCKET
      const rocketUsers = await this.prisma.user.findMany({
        where: { is_active: true }
      });

      // Langkah 3: Ambil konfigurasi mapping grup
      const groupMappings = await this.prisma.adGroupRoleMapping.findMany({
        where: { is_active: true }
      });

      // Langkah 4: Buat map untuk lookup cepat
      const rocketUserMap = new Map(rocketUsers.map(u => [u.ad_username, u]));
      const adUserMap = new Map(adUsers.map(u => [u.sAMAccountName, u]));

      // Langkah 5: Proses setiap user di AD
      for (const adUser of adUsers) {
        const existingUser = rocketUserMap.get(adUser.sAMAccountName);
        const newRole = this.determineRole(adUser.memberOf, groupMappings);

        if (!existingUser) {
          // User ada di AD tapi belum ada di ROCKET → buat baru
          await this.prisma.user.create({
            data: {
              ad_username: adUser.sAMAccountName,
              email      : adUser.mail,
              full_name  : adUser.displayName,
              role       : newRole,
              is_active  : true,
            }
          });
          stats.created++;
        } else {
          // User sudah ada — cek apakah ada perubahan yang perlu diupdate
          const needsUpdate =
            existingUser.email     !== adUser.mail           ||
            existingUser.full_name !== adUser.displayName    ||
            existingUser.role      !== newRole;

          if (needsUpdate) {
            await this.prisma.user.update({
              where: { id: existingUser.id },
              data : {
                email    : adUser.mail,
                full_name: adUser.displayName,
                role     : newRole,
              }
            });
            stats.updated++;
          }
        }
      }

      // Langkah 6: Nonaktifkan user yang ada di ROCKET tapi tidak lagi ada di AD
      // (kemungkinan karyawan yang sudah resign atau pindah unit di luar Kompro)
      for (const rocketUser of rocketUsers) {
        if (!adUserMap.has(rocketUser.ad_username)) {
          await this.prisma.user.update({
            where: { id: rocketUser.id },
            data : { is_active: false }
          });
          stats.deactivated++;
          this.logger.warn(`User dinonaktifkan (tidak ditemukan di AD): ${rocketUser.ad_username}`);
        }
      }

      // Update log dengan hasil sync
      return this.prisma.adSyncLog.update({
        where: { id: syncLog.id },
        data : {
          completed_at     : new Date(),
          status           : 'SUCCESS',
          users_created    : stats.created,
          users_updated    : stats.updated,
          users_deactivated: stats.deactivated,
        }
      });

    } catch (error) {
      this.logger.error(`AD Sync gagal: ${error.message}`);
      return this.prisma.adSyncLog.update({
        where: { id: syncLog.id },
        data : {
          completed_at : new Date(),
          status       : 'FAILED',
          error_details: error.message,
        }
      });
    }
  }

  // Tentukan role ROCKET berdasarkan keanggotaan grup AD
  private determineRole(memberOf: string[], mappings: AdGroupRoleMapping[]): UserRole {
    // Cari mapping pertama yang cocok — urutan mapping menentukan prioritas
    for (const mapping of mappings) {
      if (memberOf?.includes(mapping.ad_group)) {
        return mapping.rocket_role;
      }
    }
    // Default: Level 3 (Staff) jika tidak masuk grup manapun
    return UserRole.LEVEL_3;
  }
}
```

Tambahkan method `getAllUsers` di `LdapService` yang sudah ada:

```typescript
// Di ldap.service.ts — tambahkan method ini

async getAllUsers(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: this.configService.get('LDAP_URL') });

    // Bind menggunakan service account khusus (bukan akun user)
    client.bind(
      this.configService.get('LDAP_BIND_DN'),
      this.configService.get('LDAP_BIND_PASSWORD'),
      (err) => {
        if (err) return reject(err);

        const users: any[] = [];
        client.search(
          this.configService.get('LDAP_BASE_DN'),
          {
            // Filter: hanya user yang enabled (tidak disabled di AD)
            // dan yang berada di OU Kompro
            filter    : '(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
            scope     : 'sub',
            attributes: ['sAMAccountName', 'mail', 'displayName', 'memberOf'],
          },
          (searchErr, res) => {
            if (searchErr) return reject(searchErr);
            res.on('searchEntry', (entry) => users.push(entry.object));
            res.on('end', () => { client.destroy(); resolve(users); });
            res.on('error', (e) => { client.destroy(); reject(e); });
          }
        );
      }
    );
  });
}
```

### Perubahan Frontend

Tambahkan halaman `AdSyncPage.tsx` di Settings (hanya Super User). Halaman ini menampilkan tiga bagian utama. Bagian pertama adalah status sinkronisasi terakhir — kapan terakhir sync berjalan, berapa user yang berubah, dan apakah ada error. Bagian kedua adalah konfigurasi mapping grup AD ke role ROCKET dalam bentuk tabel yang bisa diedit. Bagian ketiga adalah tombol "Sinkronisasi Sekarang" untuk menjalankan sync secara manual tanpa menunggu jadwal cron.

---

## Fitur 7.2 — Open API & Outbound Webhooks

### Latar Belakang & Nilai Bisnis

Salah satu tanda kedewasaan sebuah platform adalah kemampuannya untuk menjadi bagian dari ekosistem yang lebih besar — bukan hanya mengonsumsi data dari sistem lain, tetapi juga menyediakan data bagi sistem lain. Fitur Open API dan Outbound Webhooks mengubah ROCKET dari sebuah aplikasi tertutup menjadi sebuah **platform yang bisa diintegrasikan**.

Perbedaan mendasar antara API dan Webhook perlu dipahami karena keduanya melayani kebutuhan yang berbeda. **API** adalah untuk integrasi yang bersifat aktif dan on-demand — sistem lain "menarik" data dari ROCKET ketika mereka membutuhkannya. **Webhook** adalah untuk integrasi yang bersifat reaktif dan real-time — ROCKET "mendorong" notifikasi ke sistem lain secara otomatis ketika sesuatu terjadi. Analogi sederhananya: API seperti menelepon seseorang untuk menanyakan kabar, sedangkan Webhook seperti meminta seseorang untuk menelepon Anda setiap kali ada berita baru.

### Perubahan Database

```prisma
// API Keys untuk integrasi sistem eksternal — berbeda dari JWT user biasa
model ApiKey {
  id          String   @id @default(uuid())
  name        String   // Nama aplikasi yang menggunakan key ini
  key_hash    String   @unique  // Hash dari API key (tidak pernah menyimpan key asli)
  key_prefix  String   // 8 karakter pertama dari key, untuk identifikasi di log (contoh: "rkt_live")

  // Batasan akses — scope menentukan endpoint mana saja yang bisa diakses
  scopes      String[] // Contoh: ["projects:read", "anggaran:read", "dashboard:read"]

  // Rate limiting — berapa request per jam yang diizinkan
  rate_limit  Int @default(1000)

  is_active   Boolean  @default(true)
  last_used_at DateTime?
  expires_at  DateTime?

  created_by_id String
  created_by    User   @relation(fields: [created_by_id], references: [id])
  created_at    DateTime @default(now())

  @@map("api_keys")
}

// Konfigurasi webhook yang dikirim ke sistem eksternal
model WebhookEndpoint {
  id          String   @id @default(uuid())
  name        String   // Nama deskriptif, contoh: "Sistem Keuangan ASABRI"
  url         String   @db.Text  // URL endpoint tujuan

  // Event apa saja yang akan memicu pengiriman ke endpoint ini
  // Disimpan sebagai array string
  events      String[] // Contoh: ["project.finished", "anggaran.realisasi.created"]

  // Secret untuk verifikasi — endpoint tujuan menggunakan ini untuk memastikan
  // bahwa request benar-benar datang dari ROCKET (bukan pihak ketiga)
  secret      String   // HMAC-SHA256 secret

  is_active   Boolean  @default(true)
  failure_count Int    @default(0)  // Jumlah pengiriman gagal berturut-turut

  created_by_id String
  created_by    User   @relation(fields: [created_by_id], references: [id])
  created_at    DateTime @default(now())

  // Log setiap pengiriman webhook
  delivery_logs WebhookDeliveryLog[]

  @@map("webhook_endpoints")
}

// Log setiap pengiriman webhook — penting untuk debugging
model WebhookDeliveryLog {
  id           String          @id @default(uuid())
  endpoint_id  String
  endpoint     WebhookEndpoint @relation(fields: [endpoint_id], references: [id])

  event_type   String    // Nama event yang dikirim
  payload      Json      // Data yang dikirim
  response_code Int?     // HTTP status code dari endpoint tujuan
  response_body String?  @db.Text
  duration_ms  Int?      // Berapa milidetik pengiriman berlangsung

  status       String    // "SUCCESS" atau "FAILED"
  sent_at      DateTime  @default(now())
  next_retry_at DateTime? // Kapan akan dicoba lagi jika gagal

  @@map("webhook_delivery_logs")
}
```

### Perubahan Backend

Buat guard khusus `ApiKeyGuard` yang memvalidasi API key dari header `X-API-Key`:

```typescript
// api-key.guard.ts

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey  = request.headers['x-api-key'];

    if (!apiKey) return false;

    // API key disimpan dalam format: prefix.secret
    // Contoh: rkt_live.abcdef1234567890...
    const keyPrefix = apiKey.substring(0, 8);
    const keyHash   = createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = await this.prisma.apiKey.findFirst({
      where: { key_prefix: keyPrefix, key_hash: keyHash, is_active: true }
    });

    if (!keyRecord) return false;
    if (keyRecord.expires_at && new Date() > keyRecord.expires_at) return false;

    // Simpan info API key di request untuk digunakan oleh guard scope
    request.apiKey = keyRecord;

    // Update last_used_at secara async (tidak perlu menunggu)
    this.prisma.apiKey.update({
      where: { id: keyRecord.id },
      data : { last_used_at: new Date() }
    }).catch(() => {}); // Abaikan error — ini bukan operasi kritis

    return true;
  }
}
```

Buat `WebhookService` yang mengirim event ke semua endpoint yang berlangganan:

```typescript
// webhook.service.ts

@Injectable()
export class WebhookService {
  constructor(
    private prisma     : PrismaService,
    private httpService: HttpService,
  ) {}

  // Dipanggil oleh service lain ketika event terjadi
  async dispatch(eventType: string, payload: any) {
    // Cari semua endpoint yang berlangganan event ini
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        is_active   : true,
        events      : { has: eventType },
        failure_count: { lt: 5 }, // Skip endpoint yang sudah gagal 5 kali berturut-turut
      }
    });

    // Kirim ke semua endpoint secara paralel (fire and forget)
    endpoints.forEach(endpoint => {
      this.sendToEndpoint(endpoint, eventType, payload).catch(() => {});
    });
  }

  private async sendToEndpoint(endpoint: WebhookEndpoint, eventType: string, payload: any) {
    const body = {
      event    : eventType,
      data     : payload,
      sent_at  : new Date().toISOString(),
      rocket_url: process.env.BACKEND_URL,
    };

    // Generate HMAC signature untuk keamanan
    // Endpoint tujuan memverifikasi header ini untuk memastikan request dari ROCKET
    const signature = createHmac('sha256', endpoint.secret)
      .update(JSON.stringify(body))
      .digest('hex');

    const startTime = Date.now();
    let status = 'FAILED', responseCode: number, responseBody: string;

    try {
      const response = await this.httpService.post(endpoint.url, body, {
        headers : {
          'Content-Type'       : 'application/json',
          'X-ROCKET-Signature' : `sha256=${signature}`,
          'X-ROCKET-Event'     : eventType,
        },
        timeout : 10000, // Timeout 10 detik
      }).toPromise();

      responseCode = response.status;
      responseBody = JSON.stringify(response.data).substring(0, 500); // Simpan max 500 char
      status = responseCode >= 200 && responseCode < 300 ? 'SUCCESS' : 'FAILED';

      // Reset failure count jika berhasil
      if (status === 'SUCCESS') {
        await this.prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data : { failure_count: 0 }
        });
      }

    } catch (error) {
      responseCode = error.response?.status;
      responseBody = error.message;

      // Increment failure count
      await this.prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data : { failure_count: { increment: 1 } }
      });
    }

    // Catat log pengiriman
    await this.prisma.webhookDeliveryLog.create({
      data: {
        endpoint_id  : endpoint.id,
        event_type   : eventType,
        payload      : body,
        response_code: responseCode,
        response_body: responseBody,
        duration_ms  : Date.now() - startTime,
        status,
      }
    });
  }
}
```

Untuk mengintegrasikan webhook ke dalam alur kerja yang sudah ada, tambahkan pemanggilan `WebhookService.dispatch` di service-service yang relevan. Contohnya di `ReviewService` ketika project diapprove:

```typescript
// Di review.service.ts — setelah approval berhasil, tambahkan baris ini:
await this.webhookService.dispatch('project.finished', {
  project_id  : project.id,
  project_name: project.name,
  finished_at : new Date(),
  pic_name    : project.pic.full_name,
});
```

Daftar event yang perlu di-dispatch mencakup: `project.created`, `project.finished`, `project.cancelled`, `project.rescheduled`, `review.submitted`, `review.approved`, `anggaran.realisasi.created`, dan `user.role_changed`.

### Perubahan Frontend

Tambahkan dua halaman di Settings. Halaman pertama `ApiKeysPage.tsx` menampilkan daftar API keys yang sudah dibuat, dengan tombol untuk membuat key baru. Saat key baru dibuat, sistem menampilkan key lengkap **hanya sekali** dalam modal — setelah modal ditutup, key tidak bisa dilihat lagi karena yang tersimpan di database hanyalah hash-nya. Tampilkan juga statistik penggunaan: kapan terakhir digunakan dan berapa total request dalam 30 hari terakhir.

Halaman kedua `WebhooksPage.tsx` menampilkan daftar endpoint webhook yang dikonfigurasi, daftar event yang tersedia beserta deskripsinya, dan log pengiriman yang bisa difilter per endpoint atau per status. Ada juga tombol "Kirim Test Event" untuk memverifikasi bahwa konfigurasi endpoint berjalan dengan benar sebelum mengandalkannya untuk integrasi production.

---

## Fitur 7.3 — Modul Audit & Compliance Khusus BUMN

### Latar Belakang & Nilai Bisnis

Sebagai BUMN yang diatur ketat, PT ASABRI menjalani berbagai siklus audit secara berkala — audit internal, pemeriksaan Komite Audit, dan audit eksternal dari BPK atau KAP. Setiap siklus audit memerlukan penyediaan dokumentasi yang lengkap dan terstruktur: siapa mengerjakan apa, kapan, dengan persetujuan siapa, menggunakan anggaran berapa, dan apakah prosedur yang berlaku telah dipatuhi.

Activity Log dari Kelompok 1 sudah menyediakan fondasi data yang diperlukan untuk ini. Modul Audit & Compliance membangun di atas fondasi tersebut dengan menambahkan lapisan **interpretasi dan presentasi** — mengubah data mentah activity log menjadi laporan audit yang terstruktur, bisa difilter per periode, dan disajikan dalam format yang familiar bagi auditor.

### Perubahan Database

```prisma
// Template laporan audit — mendefinisikan apa saja yang akan masuk ke laporan
model AuditReportTemplate {
  id           String   @id @default(uuid())
  name         String   // Contoh: "Laporan Audit Internal Q1", "Laporan BPK Tahunan"
  description  String?

  // Konfigurasi: section apa saja yang dimasukkan ke laporan ini
  // Disimpan sebagai JSON array string
  // Contoh: ["project_summary", "approval_trail", "budget_usage", "anomalies"]
  sections     String[]

  created_by_id String
  created_by    User   @relation(fields: [created_by_id], references: [id])
  created_at    DateTime @default(now())

  @@map("audit_report_templates")
}

// Laporan audit yang sudah di-generate
model GeneratedAuditReport {
  id           String   @id @default(uuid())
  template_id  String?  // Opsional — laporan bisa dibuat tanpa template

  period_start DateTime
  period_end   DateTime
  title        String

  file_path    String   // Path ke file PDF laporan
  generated_by_id String
  generated_by    User @relation(fields: [generated_by_id], references: [id])
  generated_at DateTime @default(now())

  // Metadata ringkasan yang disimpan untuk tampilan cepat tanpa perlu buka PDF
  summary_stats Json?

  @@map("generated_audit_reports")
}

// Anomali yang terdeteksi sistem — project atau transaksi yang perlu perhatian auditor
model AuditAnomaly {
  id          String   @id @default(uuid())
  type        AuditAnomalyType
  description String   @db.Text
  entity_type String   // "Project", "RealisasiAnggaran", dll
  entity_id   String

  severity    String   // "LOW", "MEDIUM", "HIGH"
  is_resolved Boolean  @default(false)
  resolution_note String? @db.Text

  detected_at DateTime @default(now())
  resolved_at DateTime?
  resolved_by_id String?

  @@map("audit_anomalies")
}

enum AuditAnomalyType {
  PROJECT_NO_APPROVAL_DOC    // Project FINISHED tanpa dokumen persetujuan
  LARGE_REALISASI_NO_DOCS    // Realisasi besar tanpa dokumen wabku
  BUDGET_OVERRUN             // Realisasi melebihi total anggaran pos
  APPROVAL_BYPASSED          // Status berubah ke FINISHED tanpa melalui review
  STALE_PROJECT              // Project ON_GOING lebih dari 90 hari tanpa update
}
```

### Perubahan Backend

Buat `AuditService` yang mengelola dua fungsi utama: deteksi anomali dan generasi laporan.

```typescript
// audit.service.ts

@Injectable()
export class AuditService {
  constructor(
    private prisma        : PrismaService,
    private exportService : ExportService,
  ) {}

  // Jalankan deteksi anomali — dipanggil oleh scheduler setiap minggu
  async detectAnomalies() {
    const anomalies = [];

    // --- Anomali 1: Project FINISHED tanpa dokumen persetujuan ---
    const finishedWithoutApproval = await this.prisma.project.findMany({
      where: {
        status      : ProjectStatus.FINISHED,
        deleted_at  : null,
        reviews     : { none: { status: ReviewStatus.APPROVED } },
        // Hanya project yang dibuat setelah sistem approval aktif
        created_at  : { gte: new Date('2025-01-01') },
      }
    });

    finishedWithoutApproval.forEach(p => anomalies.push({
      type       : AuditAnomalyType.PROJECT_NO_APPROVAL_DOC,
      description: `Project "${p.name}" berstatus Finished namun tidak memiliki rekam jejak persetujuan formal.`,
      entity_type: 'Project',
      entity_id  : p.id,
      severity   : 'HIGH',
    }));

    // --- Anomali 2: Realisasi anggaran besar tanpa dokumen wabku ---
    const largeRealisasiWithoutDocs = await this.prisma.realisasiAnggaran.findMany({
      where: {
        jumlah     : { gte: 10000000 }, // Realisasi ≥ Rp 10 juta
        dokumen_url: null,
      }
    });

    largeRealisasiWithoutDocs.forEach(r => anomalies.push({
      type       : AuditAnomalyType.LARGE_REALISASI_NO_DOCS,
      description: `Realisasi anggaran sebesar Rp ${r.jumlah.toLocaleString('id-ID')} untuk kegiatan "${r.kegiatan}" tidak memiliki dokumen pendukung.`,
      entity_type: 'RealisasiAnggaran',
      entity_id  : r.id,
      severity   : 'HIGH',
    }));

    // --- Anomali 3: Serapan melebihi pagu anggaran ---
    const budgetOverruns = await this.prisma.$queryRaw<any[]>`
      SELECT
        ap.id, ap.nama_pos, ap.total_anggaran,
        SUM(ra.jumlah) AS total_terserap
      FROM anggaran_pos ap
      JOIN realisasi_anggaran ra ON ra.anggaran_pos_id = ap.id
      WHERE ap.tahun = ${new Date().getFullYear()}
      GROUP BY ap.id, ap.nama_pos, ap.total_anggaran
      HAVING SUM(ra.jumlah) > ap.total_anggaran
    `;

    budgetOverruns.forEach(b => anomalies.push({
      type       : AuditAnomalyType.BUDGET_OVERRUN,
      description: `Pos anggaran "${b.nama_pos}" mengalami overrun: realisasi Rp ${b.total_terserap.toLocaleString('id-ID')} melebihi pagu Rp ${b.total_anggaran.toLocaleString('id-ID')}.`,
      entity_type: 'AnggaranPos',
      entity_id  : b.id,
      severity   : 'HIGH',
    }));

    // Simpan anomali baru ke database (skip yang sudah ada)
    for (const anomaly of anomalies) {
      const exists = await this.prisma.auditAnomaly.findFirst({
        where: { entity_type: anomaly.entity_type, entity_id: anomaly.entity_id,
                 type: anomaly.type, is_resolved: false }
      });
      if (!exists) {
        await this.prisma.auditAnomaly.create({ data: anomaly });
      }
    }

    this.logger.log(`Anomaly detection complete: ${anomalies.length} anomalies found.`);
  }

  // Generate laporan audit dalam format PDF
  async generateAuditReport(
    periodStart  : Date,
    periodEnd    : Date,
    sections     : string[],
    generatedById: string
  ) {
    // Kumpulkan semua data yang diperlukan secara paralel
    const [
      projectSummary,
      approvalTrail,
      budgetUsage,
      anomalies,
      activityLog,
    ] = await Promise.all([
      this.getProjectSummary(periodStart, periodEnd),
      this.getApprovalTrail(periodStart, periodEnd),
      this.getBudgetUsage(new Date().getFullYear()),
      this.prisma.auditAnomaly.findMany({ where: { detected_at: { gte: periodStart, lte: periodEnd } } }),
      this.prisma.activityLog.findMany({
        where  : { created_at: { gte: periodStart, lte: periodEnd } },
        include: { user: { select: { full_name: true, role: true } } },
        orderBy: { created_at: 'asc' },
        take   : 1000, // Batasi untuk menghindari laporan yang terlalu besar
      }),
    ]);

    const reportData = {
      meta          : { period_start: periodStart, period_end: periodEnd, generated_at: new Date() },
      project_summary: sections.includes('project_summary')  ? projectSummary : null,
      approval_trail : sections.includes('approval_trail')   ? approvalTrail  : null,
      budget_usage   : sections.includes('budget_usage')     ? budgetUsage    : null,
      anomalies      : sections.includes('anomalies')        ? anomalies      : null,
      activity_log   : sections.includes('activity_log')     ? activityLog    : null,
    };

    const html      = await this.compileAuditTemplate(reportData);
    const pdfBuffer = await this.exportService.htmlToPdf(html, { format: 'A4' });
    const filePath  = await this.storageService.save(
      { buffer: pdfBuffer, originalname: `audit-report-${format(periodStart, 'yyyy-MM-dd')}.pdf`,
        mimetype: 'application/pdf' } as any, 'audit-reports'
    );

    return this.prisma.generatedAuditReport.create({
      data: {
        period_start    : periodStart,
        period_end      : periodEnd,
        title           : `Laporan Audit ${format(periodStart, 'MMMM yyyy', { locale: id })} - ${format(periodEnd, 'MMMM yyyy', { locale: id })}`,
        file_path       : filePath,
        generated_by_id : generatedById,
        summary_stats   : { total_projects: projectSummary?.total, anomaly_count: anomalies?.length },
      }
    });
  }
}
```

### Perubahan Frontend

Tambahkan halaman `AuditPage.tsx` yang hanya bisa diakses oleh Super User dan Level 1. Halaman ini memiliki tiga tab utama.

Tab pertama "Anomali" menampilkan daftar semua anomali yang terdeteksi sistem, diurutkan dari yang paling serius. Setiap anomali memiliki tombol "Tandai Terselesaikan" dengan field wajib untuk mencatat bagaimana anomali tersebut diselesaikan. Ini penting karena auditor tidak hanya perlu tahu bahwa ada masalah, tetapi juga perlu tahu bahwa masalah tersebut sudah ditangani.

Tab kedua "Generate Laporan" menyediakan form dengan date range picker dan checklist section yang ingin dimasukkan ke laporan. Ada juga pilihan template yang sudah dibuat sebelumnya untuk kebutuhan yang berulang.

Tab ketiga "Arsip Laporan" menampilkan semua laporan audit yang pernah dibuat dengan tombol unduh untuk masing-masingnya.

---

## Urutan Implementasi yang Disarankan

Koordinasi eksternal mendominasi jadwal kelompok ini lebih dari faktor teknis manapun. Mulailah dengan **Modul Audit & Compliance** karena ia sepenuhnya self-contained — tidak memerlukan akses atau persetujuan dari sistem eksternal manapun, dan manfaatnya langsung dirasakan begitu diluncurkan. Deteksi anomali berjalan otomatis di background, dan laporan bisa dibuat kapanpun diperlukan.

Sementara Modul Audit sedang dikembangkan, mulailah proses koordinasi paralel untuk **AD Sync** dengan tim IT ASABRI. Diskusi yang perlu dilakukan mencakup struktur grup AD yang akan dipetakan ke role ROCKET, batasan akses service account untuk sync, dan prosedur penanganan jika sync gagal. Koordinasi ini biasanya memakan waktu 2-4 minggu, sehingga pengembangan teknisnya bisa berjalan begitu koordinasi selesai.

**Open API & Webhooks** dikerjakan terakhir karena ia memerlukan identifikasi sistem mana saja di ASABRI yang akan diintegrasikan, dan masing-masing integrasi memerlukan diskusi kebutuhan yang berbeda. Namun infrastruktur dasar (API key management dan webhook engine) bisa dibangun terlebih dahulu sebelum integrasi spesifik ditentukan.
