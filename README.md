# 🚀 ROCKET — Rekapitulasi Online Catatan Kerja Elektronik Terpadu

Aplikasi manajemen pekerjaan dan anggaran terintegrasi untuk Bidang Komunikasi dan Protokoler. Dibangun dengan arsitektur **monorepo** menggunakan Turborepo.

---

## 📋 Daftar Isi

- [Tech Stack](#-tech-stack)
- [Arsitektur](#-arsitektur)
- [Fitur Utama](#-fitur-utama)
- [Modul Backend](#-modul-backend)
- [Halaman Frontend](#-halaman-frontend)
- [Database Schema](#-database-schema)
- [Quick Start](#-quick-start)
- [Docker](#-docker)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Dokumentasi Lengkap](#-dokumentasi-lengkap)

---

## 🛠 Tech Stack

### Frontend
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **React** | 18.x | UI Library |
| **Vite** | 5.x | Build Tool & Dev Server |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **Ant Design** | 5.x | UI Component Library |
| **Zustand** | 4.x | State Management |
| **Recharts** | 2.x | Charting Library |
| **React Router** | 6.x | Client-side Routing |
| **Axios** | 1.x | HTTP Client |
| **Zod** | 3.x | Schema Validation |

### Backend
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **NestJS** | 10.x | Backend Framework |
| **Prisma** | 5.x | ORM & Database Client |
| **PostgreSQL** | 16.x | Relational Database |
| **Redis** | 7.x | Cache & Session |
| **Passport + JWT** | - | Authentication |
| **ldapjs** | 3.x | Active Directory Integration |
| **Nodemailer** | 6.x | Email Notification |
| **Puppeteer** | 22.x | PDF Generation |
| **ExcelJS** | 4.x | Excel Export |
| **otplib** | 13.x | MFA (TOTP) |

### Infrastructure
| Teknologi | Kegunaan |
|---|---|
| **Turborepo** | Monorepo Build System |
| **Docker Compose** | Container Orchestration |
| **Nginx** | Reverse Proxy (Production) |
| **PM2** | Process Manager (Production) |
| **Swagger** | API Documentation |

---

## 🏗 Arsitektur

```
                    ┌─────────────────────┐
                    │     Frontend SPA     │
                    │  React + Vite + TS   │
                    │    (port 5173)       │
                    └─────────┬───────────┘
                              │ REST API
                    ┌─────────▼───────────┐
                    │    Backend API       │
                    │  NestJS + Prisma     │
                    │    (port 3001)       │
                    └──┬──────────────┬────┘
                       │              │
              ┌────────▼──┐    ┌──────▼──────┐
              │ PostgreSQL │    │    Redis    │
              │  (port     │    │  (port      │
              │   5433)    │    │   6379)     │
              └────────────┘    └─────────────┘
                       │
              ┌────────▼──────────┐
              │  Active Directory  │
              │     (LDAP)         │
              └───────────────────┘
```

**Monorepo Structure:**
```
rocket-app/
├── apps/
│   ├── frontend/          → React + Vite + Tailwind + Ant Design
│   └── backend/           → NestJS + Prisma + PostgreSQL
├── packages/
│   └── shared-types/      → TypeScript type definitions bersama
├── docker-compose.yml     → Dev: PostgreSQL + Redis
├── docker-compose.prod.yml → Production setup
├── turbo.json             → Turborepo configuration
└── package.json           → Workspace root
```

---

## ✨ Fitur Utama

### 🔐 Authentication & Security
- Login via **LDAP Active Directory** dengan JIT user provisioning
- **JWT** token-based authentication
- **MFA** (Multi-Factor Authentication) via TOTP (Google Authenticator, Authy)
- **Role-based access control** (SUPER_USER, LEVEL_1, LEVEL_2, LEVEL_3)
- Rate limiting & Helmet security headers
- Password management (change, admin reset)

### 📊 Working Tracker
- CRUD project & sub-project dengan PIC assignment
- **7 status lifecycle**: TO_DO_NEXT → ON_GOING → NEED_FOLLOW_UP → FINISHED
- Kanban board view
- Due date tracking dengan reminder H-3 otomatis
- Soft delete dengan recovery

### ✅ Review & Approval
- Alur approval berjenjang: **Staff → Kabid (LEVEL_2) → Kadiv (LEVEL_1)**
- Review comments & revision history
- E-Signature digital untuk approval documents

### 💰 Budget Management (Anggaran)
- Manajemen pos anggaran RKAP per tahun
- Input realisasi pengeluaran
- Kalkulasi serapan real-time
- Upload dokumen pendukung

### 📈 Dashboard & Analytics
- Overview project per status, per PIC, per bulan
- Bar chart, Pie chart, Gauge serapan anggaran
- Workload analysis per staff
- Risk analysis scoring
- Executive dashboard dengan shareable token
- KPI tracking & progress monitoring

### 📩 Notifications
- In-app notification (bell icon + dropdown)
- Email notification via SMTP
- Teams webhook integration
- Configurable notification preferences
- PWA push subscriptions

### 📄 Document & Export
- Document management dengan versioning
- Export PDF via Puppeteer
- Export Excel via ExcelJS
- Automated weekly/monthly reports
- Recurring project auto-creation

### 🔍 Additional Features
- Global search
- Activity log & audit trail
- Meeting management & action items
- Project templates
- Link penting unit kerja
- Calendar view
- Audit & compliance reports

---

## 🧩 Modul Backend

| # | Modul | Deskripsi |
|---|---|---|
| 1 | `auth` | Login LDAP, JWT, MFA, password management |
| 2 | `users` | CRUD user, role management, AD sync |
| 3 | `projects` | CRUD project utama, filter, soft delete |
| 4 | `sub-projects` | Sub-project nested di bawah project |
| 5 | `review` | Alur approval berjenjang dengan history |
| 6 | `anggaran` | Pos anggaran RKAP per tahun |
| 7 | `realisasi` | Input & tracking realisasi pengeluaran |
| 8 | `dashboard` | Agregasi data untuk visualisasi |
| 9 | `notifications` | In-app + email notifications |
| 10 | `export` | Generate PDF, Excel, CSV |
| 11 | `scheduler` | Cron jobs (H-3 reminder, auto-reports) |
| 12 | `comments` | Diskusi threaded per project |
| 13 | `activity-log` | Audit trail semua perubahan |
| 14 | `search` | Full-text search global |
| 15 | `documents` | Document management + versioning |
| 16 | `link-penting` | Link penting unit kerja |
| 17 | `kpi` | KPI target & tracking |
| 18 | `meetings` | Meeting management & action items |
| 19 | `project-templates` | Template project reusable |
| 20 | `recurring` | Recurring project auto-creation |
| 21 | `risk-analysis` | Risk scoring per project |
| 22 | `teams-webhook` | Microsoft Teams integration |
| 23 | `audit` | Compliance & anomaly detection |

---

## 📱 Halaman Frontend

| Kategori | Halaman | Deskripsi |
|---|---|---|
| **Auth** | Login | Login dengan username/password AD |
| **Dashboard** | Dashboard | Overview visualisasi semua data |
| **Working Tracker** | Board / List | Kanban board & tabel project |
| **Review** | Review List | Daftar project perlu approval |
| **Anggaran** | Anggaran | Pos anggaran + realisasi |
| **Documents** | Documents | Manajemen dokumen + versioning |
| **KPI** | KPI Tracking | Target & progress KPI |
| **Meetings** | Meetings | Jadwal rapat & action items |
| **Recurring** | Recurring | Konfigurasi project berulang |
| **Risk** | Risk Analysis | Scoring risiko project |
| **Calendar** | Calendar | Kalender project & deadline |
| **Workload** | Workload | Analisis beban kerja per PIC |
| **Audit** | Audit | Laporan compliance |
| **Templates** | Templates | Template project reusable |
| **Exec Dashboard** | Executive | Dashboard eksekutif (shareable) |
| **Link Penting** | Links | Link penting unit kerja |
| **Settings** | Profile | Profil user, MFA setup |
| **Settings** | User Management | Kelola user (Super User) |

---

## 🗄 Database Schema

Database menggunakan PostgreSQL dengan **33 tabel** yang dikelompokkan dalam cluster:

**Cluster 1 — User & Auth:** `users`, `user_notification_preferences`, `push_subscriptions`, `user_signatures`, `ad_group_role_mappings`, `ad_sync_logs`

**Cluster 2 — Working Tracker:** `projects`, `sub_projects`, `project_reviews`, `project_comments`, `activity_logs`, `project_templates`, `sub_project_templates`

**Cluster 3 — Anggaran:** `anggaran_pos`, `realisasi_anggaran`, `workload_snapshots`, `teams_webhook_configs`

**Cluster 4 — Konten & Notifikasi:** `link_penting`, `notifications`, `project_risk_scores`, `pic_historical_stats`, `exec_dashboard_tokens`

**Cluster 5 — Documents:** `documents`, `document_versions`, `project_documents`, `recurring_configs`, `recurring_execution_logs`

**Cluster 6 — KPI & Meetings:** `kpi_targets`, `kpi_project_links`, `kpi_progress_notes`, `meetings`, `action_items`, `approval_documents`

**Cluster 7 — Integration:** `api_keys`, `webhook_endpoints`, `webhook_delivery_logs`, `audit_report_templates`, `generated_audit_reports`, `audit_anomalies`, `generated_reports`

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x LTS
- npm 10.x
- Docker Desktop (untuk PostgreSQL & Redis)

### Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd rocket-app

# 2. Install dependencies (seluruh monorepo)
npm install

# 3. Start PostgreSQL & Redis via Docker
docker-compose up -d

# 4. Setup database
cd apps/backend
cp .env.example .env    # Lalu edit .env sesuai kebutuhan
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed

# 5. Start development (dari root)
cd ../..
npm run dev
```

### URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Swagger Docs | http://localhost:3001/api/docs |
| Prisma Studio | http://localhost:5555 (manual) |

### Default Dev Users

| Username | Role | Password |
|---|---|---|
| `admin` | SUPER_USER | (dari `SEED_PASSWORD` env) |
| `user.superuser` | SUPER_USER | (dari `SEED_PASSWORD` env) |
| `user.kadiv` | LEVEL_1 | (dari `SEED_PASSWORD` env) |
| `user.manager` | LEVEL_2 | (dari `SEED_PASSWORD` env) |
| `user.staff1`~`6` | LEVEL_3 | (dari `SEED_PASSWORD` env) |

> **Note:** Di dev mode tanpa LDAP, password apapun diterima.

---

## 🐳 Docker

### Development
```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Stop
docker-compose down

# Dengan Prisma Studio (GUI database)
docker-compose --profile studio up -d
```

### Production
```bash
# Build & deploy semua service
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ⚙️ Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Deskripsi | Contoh |
|---|---|---|
| `PORT` | Port backend server | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret key untuk JWT (min 64 char) | `random-string...` |
| `JWT_EXPIRES_IN` | JWT expiration time | `8h` |
| `LDAP_URL` | URL Active Directory server | `ldap://ad.company.co.id` |
| `LDAP_BASE_DN` | LDAP Base DN | `DC=company,DC=co,DC=id` |
| `LDAP_BIND_DN` | Service account DN | `CN=svc-rocket,OU=...` |
| `LDAP_BIND_PASSWORD` | Service account password | `***` |
| `SMTP_HOST` | SMTP server host | `mail.company.co.id` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `noreply@company.co.id` |
| `SMTP_PASS` | SMTP password | `***` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `FRONTEND_URL` | Frontend URL (CORS) | `http://localhost:5173` |
| `SEED_PASSWORD` | Default password for seeded users | `ChangeMe@123` |

### Frontend (`apps/frontend/.env`)

| Variable | Deskripsi | Contoh |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3001/api` |
| `VITE_APP_NAME` | Nama aplikasi | `ROCKET` |
| `VITE_APP_COMPANY` | Nama perusahaan | `PT Company (Persero)` |

> Salin `.env.example` ke `.env` dan sesuaikan nilainya.

---

## 📚 API Documentation

Swagger UI tersedia di development mode:

```
http://localhost:3001/api/docs
```

API menggunakan **Bearer Token** authentication. Login via `POST /api/auth/login` untuk mendapatkan JWT token.

---

## 📁 Project Structure

```
rocket-app/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── modules/           ← 23 feature modules
│   │   │   ├── common/            ← Guards, decorators, interceptors
│   │   │   ├── prisma/            ← Prisma service (global)
│   │   │   ├── app.module.ts      ← Root module
│   │   │   └── main.ts            ← Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma      ← Database schema (889 lines)
│   │   │   └── seed.ts            ← Seed data
│   │   ├── .env.example           ← Environment template
│   │   ├── Dockerfile             ← Production build
│   │   └── package.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── pages/             ← 18 page directories
│       │   ├── components/        ← Reusable UI components
│       │   ├── hooks/             ← Custom React hooks
│       │   ├── stores/            ← Zustand state management
│       │   ├── services/          ← API service layer (Axios)
│       │   ├── utils/             ← Helper functions
│       │   └── router/            ← React Router config + guards
│       ├── .env.example           ← Environment template
│       ├── Dockerfile             ← Production build
│       └── package.json
│
├── packages/
│   └── shared-types/              ← Shared TypeScript types
│
├── nginx/                         ← Nginx reverse proxy config
├── docker-compose.yml             ← Dev environment
├── docker-compose.prod.yml        ← Production environment
├── ecosystem.config.js            ← PM2 configuration
├── turbo.json                     ← Turborepo configuration
└── .gitignore
```

---

## 🚢 Deployment

### Opsi 1: VPS / Server Internal (Recommended for LDAP)
```bash
# Build
npm run build

# Run with PM2
pm2 start ecosystem.config.js --env production

# Nginx reverse proxy
# See: nginx/nginx.conf
```

### Opsi 2: Frontend Vercel + Backend Railway
- Frontend → Vercel (Vite SPA)
- Backend → Railway / Render (NestJS)
- Database → Railway PostgreSQL / Supabase

> Lihat [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) untuk panduan lengkap.

---

## 📖 Dokumentasi Lengkap

| Dokumen | Deskripsi |
|---|---|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Panduan deploy & setup LDAP |
| [database.md](database.md) | Arsitektur database & ERD |
| [setup_code.md](setup_code.md) | Panduan setup & instalasi lengkap |
| [project_tree.md](project_tree.md) | Struktur project detail |
| [modul.md](modul.md) | Referensi modul & API endpoint |

---

## 📄 License

Private — Internal Use Only.
