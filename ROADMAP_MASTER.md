# 🗺️ ROADMAP MASTER — Aplikasi ROCKET
### PT ASABRI (Persero) | Bidang Komunikasi dan Protokoler
> Dokumen ini adalah peta navigasi seluruh perjalanan pengembangan ROCKET dari fondasi hingga visi akhir.
> Terakhir diperbarui: 2025

---

## Cara Membaca Dokumen Ini

Roadmap ini bukan sekadar daftar fitur yang diurutkan. Ia adalah **narasi evolusi** — kisah tentang bagaimana sebuah aplikasi working tracker sederhana bertransformasi secara bertahap menjadi platform operasional yang cerdas dan terintegrasi. Setiap kelompok membangun di atas fondasi yang diletakkan oleh kelompok sebelumnya, dan penting untuk memahami hubungan antar kelompok ini untuk mengelola prioritas dengan bijak.

---

## Gambaran Besar: 8 Fase Evolusi ROCKET

```
FONDASI          MATURITAS             DIFERENSIASI
────────────────────────────────────────────────────────────────
[K1] Quick Win → [K2] Produktivitas → [K3] Kolaborasi → [K4] Analitik
                                                              ↓
[K8] Inovasi ← [K7] Integrasi ← [K6] Domain Baru ← [K5] Pendalaman
────────────────────────────────────────────────────────────────
Waktu pengerjaan: ──────────── 18–24 bulan total ────────────
```

---

## Kelompok 1 — Quick Win ✅
> `update_kelompok1_quick_win.md` | Estimasi: 2–3 minggu

Kelompok ini adalah tentang **membangun kepercayaan pengguna** secepatnya. Tiga fitur yang dikerjakan — Komentar & Diskusi, Activity Log, dan Preferensi Notifikasi — tidak memerlukan infrastruktur baru yang besar, namun dampaknya dirasakan setiap hari oleh seluruh pengguna. Komentar memindahkan diskusi dari WhatsApp ke dalam sistem. Activity Log membangun jejak audit yang menjadi fondasi untuk kelompok-kelompok berikutnya. Preferensi Notifikasi mengurangi notification fatigue yang bisa membuat pengguna mengabaikan peringatan penting.

Hal paling teknis yang layak dicatat dari kelompok ini adalah bagaimana Activity Log diimplementasikan menggunakan Prisma Middleware — satu fungsi yang dipasang sekali secara terpusat dan otomatis mencatat semua perubahan data tanpa harus menyentuh kode di setiap service.

**Dependensi kelompok lain yang bergantung padanya:** Activity Log digunakan oleh Kelompok 4 (Early Warning System), Kelompok 7 (Audit Compliance), dan Kelompok 8 (AI Assistant context).

---

## Kelompok 2 — Produktivitas 🛠️
> `update_kelompok2_productivity.md` | Estimasi: 4–6 minggu

Jika Kelompok 1 membuat pengguna lebih nyaman, Kelompok 2 membuat tim **bekerja lebih cepat dan lebih cerdas**. Kalender Terintegrasi dengan drag-and-drop rescheduling mengubah cara Kabid merencanakan distribusi pekerjaan — dari melihat tabel angka ke melihat visualisasi waktu yang intuitif. Template Project menghilangkan pekerjaan repetitif pembuatan project serupa. Laporan Otomatis mingguan dan bulanan memastikan manajemen mendapat informasi kritis tanpa harus login ke sistem.

Kelompok ini direkomendasikan dikerjakan segera setelah Kelompok 1 stabil, karena Template Project sangat berguna sebelum adanya banyak kegiatan berulang — semakin awal dibuat, semakin banyak waktu yang dihemat.

**Dependensi kelompok lain yang bergantung padanya:** Template Project menjadi fondasi untuk Kelompok 5's Recurring Projects.

---

## Kelompok 3 — Kolaborasi & Visibilitas 🤝
> `update_kelompok3_collaboration.md` | Estimasi: 5–7 minggu

Kelompok ini adalah tentang **cara pandang baru** terhadap data yang sama dan **memperluas jangkauan** sistem ke platform lain. Kanban Board memberikan perspektif aliran kerja yang tidak bisa diberikan oleh tabel. Workload Management memberikan data objektif untuk menggantikan intuisi dalam mendistribusikan pekerjaan. Integrasi Microsoft Teams memastikan notifikasi ROCKET bertemu pengguna di mana mereka sudah berada. PWA memungkinkan akses mobile yang andal bahkan saat koneksi tidak stabil.

Penting untuk dicatat bahwa Workload Management baru bermakna setelah snapshot data terkumpul beberapa minggu — cron job untuk snapshot harian harus dipasang sejak hari pertama kelompok ini diluncurkan, bahkan jika halaman UI-nya belum selesai.

**Dependensi kelompok lain yang bergantung padanya:** Tidak ada dependensi langsung, tetapi adopsi PWA yang baik membuat fitur-fitur kelompok berikutnya lebih mudah diadopsi karena pengguna sudah terbiasa mengakses ROCKET dari ponsel.

---

## Kelompok 4 — Analitik Lanjutan 📊
> `update_kelompok4_analytics.md` | Estimasi: 6–8 minggu

Kelompok ini adalah **titik infleksi** pertama dalam evolusi ROCKET — dari alat operasional menjadi sumber intelijen bisnis. Early Warning System menggunakan data historis untuk memprediksi keterlambatan sebelum terjadi, memberikan waktu intervensi yang jauh lebih leluasa. Dashboard Eksekutif menyediakan akses informasi untuk pimpinan tanpa harus memiliki akun penuh di sistem.

**Syarat minimum sebelum Early Warning System diluncurkan:** Database harus sudah memiliki minimal 50 project yang berstatus Finished dengan data activity log yang lengkap. Tanpa ini, model prediksi tidak memiliki data historis yang cukup untuk menghasilkan prediksi yang bermakna. Dashboard Eksekutif tidak memiliki syarat minimum dan bisa diluncurkan kapanpun.

**Dependensi kelompok lain yang bergantung padanya:** Risk score dari Early Warning System digunakan oleh Kelompok 7 (Audit Compliance) sebagai salah satu sumber anomali, dan oleh Kelompok 8 (AI Assistant) sebagai konteks percakapan.

---

## Kelompok 5 — Pendalaman Fitur Inti 🔬
> `update_kelompok5_deepening.md` | Estimasi: 4–5 minggu

Di titik ini, ROCKET sudah berjalan dengan baik dan data sudah cukup banyak. Kelompok 5 adalah tentang **menutup celah yang mulai terasa** seiring pertumbuhan penggunaan. Full-Text Search menjawab keluhan "saya tahu pernah ada project/komentar tentang ini tapi tidak bisa menemukannya." Document Management menjawab masalah link mati dan tidak adanya versioning dokumen. Recurring Projects menghilangkan pekerjaan manual pembuatan project periodik yang sudah semestinya bisa otomatis.

Full-Text Search menggunakan kemampuan built-in PostgreSQL (`tsvector`, `tsquery`) yang sudah tersedia tanpa perlu infrastruktur tambahan — ini adalah nilai tambah yang sangat signifikan dari sisi operasional. Tidak perlu mengelola server Elasticsearch terpisah.

**Dependensi kelompok lain yang bergantung padanya:** Document versioning dari Document Management digunakan oleh Kelompok 6 (e-Signature) sebagai tempat menyimpan dokumen persetujuan yang sudah ditandatangani. Recurring Projects menggunakan Template Project dari Kelompok 2.

---

## Kelompok 6 — Perluasan Domain Bisnis 🏢
> `update_kelompok6_business_domain.md` | Estimasi: 6–8 minggu

Inilah **lompatan kualitatif** kedua dalam evolusi ROCKET. Tiga modul baru yang diperkenalkan — KPI Tracking, Meeting Management, dan e-Signature — membawa domain bisnis yang sama sekali baru ke dalam sistem. KPI Tracking memberikan makna strategis pada pekerjaan-pekerjaan di Working Tracker. Meeting Management menutup kesenjangan antara keputusan rapat dan tindak lanjutnya. e-Signature melengkapi alur persetujuan digital yang sebelumnya masih mengandalkan dokumen fisik.

Kelompok ini memiliki koordinasi human yang paling banyak dibandingkan kelompok manapun sebelumnya. KPI Tracking memerlukan diskusi mendalam tentang definisi KPI yang ingin diukur. e-Signature memerlukan koordinasi dengan tim Legal untuk memastikan keabsahan hukumnya. Estimasi waktu pengerjaan yang lebih panjang di sini sebagian besar disebabkan oleh koordinasi ini.

**Dependensi kelompok lain yang bergantung padanya:** KPI data digunakan oleh Kelompok 7 (Audit Compliance) sebagai salah satu dimensi laporan audit, dan oleh Kelompok 8 (AI Assistant) sebagai konteks analitik.

---

## Kelompok 7 — Integrasi Ekosistem ASABRI 🔗
> `update_kelompok7_integration.md` | Estimasi: 7–10 minggu

Di sinilah ROCKET berhenti menjadi "pulau terisolasi" dan mulai **menjadi bagian dari ekosistem digital ASABRI** yang lebih besar. Sinkronisasi Active Directory dua arah menghilangkan jeda antara perubahan organisasi di AD dan pembaruan akses di ROCKET. Open API dan Outbound Webhooks mengubah ROCKET dari sistem yang hanya mengonsumsi menjadi sistem yang juga menyediakan data bagi sistem lain. Modul Audit & Compliance mengintegrasikan semua data yang sudah ada (activity log, approval trail, budget records, anomaly detection) menjadi laporan audit yang terstruktur dan siap disajikan kepada auditor.

Perlu ditekankan bahwa koordinasi eksternal dengan tim IT ASABRI dan sistem-sistem lain yang akan diintegrasikan harus dimulai **jauh sebelum** pengembangan teknis dimulai — idealnya bersamaan dengan pengerjaan Kelompok 6.

**Dependensi kelompok lain yang bergantung padanya:** Infrastruktur Webhook dari fitur ini memungkinkan Kelompok 8 (AI Assistant) untuk mengintegrasikan data dari sistem eksternal ASABRI sebagai konteks tambahan.

---

## Kelompok 8 — Inovasi & Diferensiasi 🚀
> `update_kelompok8_innovation.md` | Estimasi: 8–12 minggu

Kelompok terakhir ini adalah **puncak evolusi** ROCKET — titik di mana sistem tidak lagi hanya merespons pengguna, tetapi mulai secara aktif membantu dan memotivasi mereka. AI Assistant berbasis Claude API mengubah cara pengguna berinteraksi dengan data: dari klik-dan-filter menjadi tanya-dan-dapatkan-jawaban dalam bahasa natural. Gamification & Recognition System membangun mekanisme formal untuk pengakuan pencapaian yang terbukti menjadi motivator kuat dalam adopsi sistem jangka panjang.

Yang membuat kelompok ini istimewa secara teknis adalah bahwa keduanya bersifat **cross-cutting** — mereka mengintegrasikan data dari semua kelompok sebelumnya. AI Assistant menggunakan activity log (K1), risk scores (K4), KPI data (K6), dan audit history (K7) sebagai konteks. Achievement Engine memantau semua operasi yang terjadi di Working Tracker, Anggaran, dan Review module. Ini berarti semakin kaya data dari kelompok-kelompok sebelumnya, semakin baik kualitas output dari Kelompok 8.

---

## Timeline Keseluruhan yang Disarankan

Berikut adalah gambaran timeline realistis jika pengembangan berjalan secara serial dengan satu tim inti. Jika ada dua tim yang bekerja paralel, beberapa kelompok bisa dikerjakan bersamaan dan total waktu bisa dipersingkat sekitar 30%.

| Fase | Kelompok | Durasi Estimasi | Kumulatif |
|---|---|---|---|
| Fase 1 — Fondasi Awal | Kelompok 1 | 2–3 minggu | Bulan 1 |
| Fase 2 — Produktivitas | Kelompok 2 | 4–6 minggu | Bulan 2–3 |
| Fase 3 — Kolaborasi | Kelompok 3 | 5–7 minggu | Bulan 3–5 |
| Fase 4 — Intelijen | Kelompok 4 | 6–8 minggu | Bulan 5–7 |
| Fase 5 — Pendalaman | Kelompok 5 | 4–5 minggu | Bulan 7–9 |
| Fase 6 — Domain Baru | Kelompok 6 | 6–8 minggu | Bulan 9–11 |
| Fase 7 — Integrasi | Kelompok 7 | 7–10 minggu | Bulan 11–14 |
| Fase 8 — Inovasi | Kelompok 8 | 8–12 minggu | Bulan 14–18 |

---

## Matriks Keputusan: Kapan Harus Memulai Setiap Kelompok

Bukan hanya soal urutan waktu — ada kondisi yang harus terpenuhi sebelum setiap kelompok dimulai. Tabel ini merangkum kondisi tersebut.

| Kelompok | Kondisi Minimum untuk Memulai |
|---|---|
| Kelompok 1 | Sistem core (K1–K4 sebelumnya, yaitu fondasi ROCKET) sudah stabil di production |
| Kelompok 2 | Kelompok 1 sudah berjalan minimal 2 minggu dan tidak ada bug kritis |
| Kelompok 3 | Kelompok 2 sudah diluncurkan; tim IT ASABRI sudah dikonfirmasi untuk Teams webhook |
| Kelompok 4 | Kelompok 1 sudah berjalan; database memiliki minimal 30 project finished untuk Early Warning |
| Kelompok 5 | Kelompok 4 stabil; strategi file storage untuk Document Management sudah diputuskan |
| Kelompok 6 | Kelompok 5 stabil; diskusi KPI definition dengan Kabid sudah selesai; tim Legal sudah dikonsultasikan untuk e-Signature |
| Kelompok 7 | Kelompok 6 stabil; koordinasi dengan tim IT ASABRI untuk AD sync sudah berjalan minimal 4 minggu sebelumnya |
| Kelompok 8 | **Semua** kelompok sebelumnya stabil; sistem sudah berjalan minimal 12 bulan; database memiliki >100 project finished; budget untuk Claude API sudah disetujui |

---

## Peta Dependensi Antar Kelompok

Visualisasi di bawah menunjukkan kelompok mana yang menjadi prasyarat bagi kelompok lain. Panah menunjukkan arah dependensi (A → B berarti "B memerlukan A sudah berjalan").

```
K1 (Activity Log) ─────────────────────────────────┐
     │                                              ↓
     │──────────────────────────────────────→ K4 (Early Warning)
     │                                              │
     │                                              ↓
     │──────────────────────────────────────→ K7 (Audit)
     │                                              │
     └──────────────────────────────────────→ K8 (AI Assistant)
                                                    ↑
K2 (Template) ──→ K5 (Recurring) ─────────────────┤
                                                    │
K4 (Risk Scores) ─────────────────────────────────┤
                                                    │
K6 (KPI Data) ────────────────────────────────────┘

K5 (Doc Mgmt) ──→ K6 (e-Signature)

K3 (PWA) ─────────→ [Meningkatkan adopsi semua kelompok berikutnya]
```

---

## Prinsip Pengembangan yang Harus Dijaga Sepanjang Roadmap

Ada tiga prinsip yang harus dipertahankan sepanjang pengembangan, terlepas dari kelompok mana yang sedang dikerjakan. Kehilangan prinsip-prinsip ini di tengah jalan adalah risiko terbesar yang bisa menggagalkan keseluruhan roadmap.

**Prinsip pertama adalah backward compatibility** — setiap fitur baru tidak boleh merusak fitur yang sudah berjalan. Ini terdengar jelas, tetapi dalam praktiknya memerlukan kedisiplinan tinggi dalam desain API dan database. Setiap perubahan schema harus menggunakan migrasi yang additive (menambah kolom, bukan mengubah tipe kolom yang sudah ada). Setiap perubahan API endpoint harus mempertahankan response format yang sudah ada sambil menambahkan field baru yang opsional.

**Prinsip kedua adalah incremental value** — setiap kelompok harus bisa diluncurkan dan memberikan nilai secara mandiri, bahkan jika kelompok berikutnya belum selesai. Ini berarti tidak ada kelompok yang hanya "setengah jadi" saat diluncurkan — fitur yang tidak siap lebih baik ditunda ke kelompok berikutnya daripada diluncurkan dalam kondisi yang tidak matang.

**Prinsip ketiga adalah data quality first** — fitur-fitur yang bergantung pada data historis (Early Warning System, AI Assistant, Analytics) hanya bisa memberikan nilai yang bermakna jika data yang tersimpan berkualitas tinggi dan lengkap. Ini berarti edukasi pengguna tentang pentingnya mengisi data dengan benar (update notes yang deskriptif, dokumen yang dilampirkan, komentar yang substantif) adalah bagian integral dari setiap fase peluncuran, bukan afterthought.

---

## Visi Akhir: ROCKET sebagai Sistem Kerja Cerdas

Setelah seluruh delapan kelompok selesai, ROCKET akan memiliki kemampuan yang jauh melampaui definisi awal sebagai "working tracker." Ia akan menjadi sebuah **sistem kerja cerdas** yang:

Pertama, **merekam** semua aktivitas kerja secara otomatis tanpa beban tambahan bagi pengguna — dari project yang dibuat, komentar yang ditulis, dokumen yang diupload, hingga setiap perubahan status yang terjadi.

Kedua, **memperingatkan** sebelum masalah terjadi — proyek yang berisiko tinggi teridentifikasi sebelum terlambat, anggaran yang hampir overrun terdeteksi sebelum terlampaui, dan anomali yang perlu perhatian auditor dimunculkan sebelum audit berlangsung.

Ketiga, **memudahkan** pengambilan keputusan dengan menyajikan informasi yang tepat kepada orang yang tepat pada waktu yang tepat — briefing harian untuk Kabid, dashboard eksekutif untuk pimpinan, laporan audit untuk tim compliance, dan analitik risiko untuk semua level.

Keempat, **menghubungkan** ROCKET dengan ekosistem digital ASABRI yang lebih luas — menerima data dari Active Directory, mengirimkan event ke sistem keuangan, dan berkomunikasi dengan Microsoft Teams tempat tim sudah berinteraksi setiap harinya.

Dan kelima, **belajar** dari data yang sudah terkumpul untuk memberikan panduan yang semakin personal dan semakin akurat — AI Assistant yang memahami konteks spesifik tim Kompro ASABRI, bukan hanya chatbot generik yang menjawab pertanyaan tanpa konteks.

Inilah tujuan akhir dari roadmap delapan kelompok ini: sebuah aplikasi yang dimulai sebagai working tracker sederhana namun bertumbuh menjadi mitra kerja digital yang sesungguhnya bagi tim Komunikasi dan Protokoler PT ASABRI.
