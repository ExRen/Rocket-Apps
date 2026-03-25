# ⚙️ Setup & Installation Guide — Aplikasi ROCKET
### PT ASABRI (Persero) | Bidang Komunikasi dan Protokoler

---

## Daftar Isi

1. [Prasyarat Sistem](#1-prasyarat-sistem)
2. [Gambaran Arsitektur Deployment](#2-gambaran-arsitektur-deployment)
3. [Setup Development (Lokal)](#3-setup-development-lokal)
4. [Konfigurasi Database](#4-konfigurasi-database)
5. [Konfigurasi Backend NestJS](#5-konfigurasi-backend-nestjs)
6. [Konfigurasi Frontend React](#6-konfigurasi-frontend-react)
7. [Konfigurasi LDAP Active Directory](#7-konfigurasi-ldap-active-directory)
8. [Konfigurasi Email SMTP](#8-konfigurasi-email-smtp)
9. [Menjalankan Aplikasi (Development)](#9-menjalankan-aplikasi-development)
10. [Build & Deployment Production](#10-build--deployment-production)
11. [Docker Setup Lengkap](#11-docker-setup-lengkap)
12. [Konfigurasi Nginx (Reverse Proxy)](#12-konfigurasi-nginx-reverse-proxy)
13. [Troubleshooting Umum](#13-troubleshooting-umum)
14. [Checklist Go-Live](#14-checklist-go-live)

---

## 1. Prasyarat Sistem

Pastikan semua software berikut sudah terinstal di mesin development sebelum memulai. Versi yang disebutkan adalah versi minimum yang direkomendasikan.

### Software Development (Wajib)

| Software | Versi Minimum | Keterangan |
|---|---|---|
| **Node.js** | 20.x LTS | Runtime JavaScript. Gunakan versi LTS, hindari versi ganjil (odd) karena tidak stabil |
| **npm** | 10.x | Sudah termasuk bersama Node.js |
| **PostgreSQL** | 15.x | Database engine utama |
| **Redis** | 7.x | Untuk caching dan session store |
| **Git** | 2.x | Version control |
| **Docker Desktop** | 4.x | Opsional tapi sangat direkomendasikan untuk setup cepat |

### Software Server Production (Wajib)

| Software | Versi | Keterangan |
|---|---|---|
| **Ubuntu** | 22.04 LTS | OS server yang direkomendasikan |
| **Node.js** | 20.x LTS | Sama dengan development |
| **PostgreSQL** | 15.x | Bisa di server yang sama atau terpisah |
| **Redis** | 7.x | Bisa di server yang sama atau terpisah |
| **Nginx** | 1.24.x | Reverse proxy dan serving static files frontend |
| **PM2** | 5.x | Process manager untuk Node.js di production |
| **Certbot** | Latest | SSL/HTTPS certificate (Let's Encrypt) jika domain publik |

### Akun & Akses yang Dibutuhkan

Untuk mengintegrasikan fitur-fitur tertentu, tim perlu memiliki akses berikut sebelum development dimulai: akses ke Active Directory server ASABRI (URL, Base DN, dan service account), akses ke SMTP server email ASABRI (host, port, kredensial), dan akses ke server production (SSH dengan sudo privileges).

---

## 2. Gambaran Arsitektur Deployment

Memahami arsitektur deployment sejak awal akan membantu developer memahami mengapa setiap konfigurasi diperlukan.

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET / INTRANET               │
└──────────────────────────┬──────────────────────────┘
                           │ HTTPS (port 443)
                           ▼
┌─────────────────────────────────────────────────────┐
│              SERVER PRODUKSI ASABRI                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              NGINX (port 443)                │   │
│  │  - SSL termination                           │   │
│  │  - Serve static files React (dist/)          │   │
│  │  - Proxy /api/* → Backend :3001              │   │
│  └──────────────┬──────────────────────────────┘   │
│                 │                                   │
│      ┌──────────▼──────────┐                       │
│      │   NestJS Backend    │                       │
│      │   (PM2, port 3001)  │                       │
│      └──────┬──────┬───────┘                       │
│             │      │                               │
│    ┌────────▼──┐ ┌──▼──────┐                       │
│    │ PostgreSQL│ │  Redis  │                       │
│    │ (port 5432│ │ (port   │                       │
│    │           │ │  6379)  │                       │
│    └───────────┘ └─────────┘                       │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │          Active Directory LDAP               │  │
│  │   (Sudah ada di infrastruktur ASABRI)        │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 3. Setup Development (Lokal)

### Langkah 3.1 — Clone Repository

```bash
# Clone dari repository Git (sesuaikan URL dengan repository ASABRI)
git clone https://github.com/asabri/rocket-app.git

# Masuk ke folder project
cd rocket-app
```

### Langkah 3.2 — Install Dependencies

Karena project ini menggunakan struktur monorepo, kita install dependencies dari root sekaligus untuk frontend dan backend.

```bash
# Install dependencies untuk seluruh project sekaligus
# npm workspaces akan otomatis install semua apps/ dan packages/
npm install
```

Jika menggunakan Turborepo, instalasi cukup sekali dari root. Jika tidak menggunakan Turborepo, install secara terpisah:

```bash
# Install shared-types terlebih dahulu
cd packages/shared-types && npm install && npm run build && cd ../..

# Install backend
cd apps/backend && npm install && cd ../..

# Install frontend
cd apps/frontend && npm install && cd ../..
```

### Langkah 3.3 — Jalankan Layanan via Docker (Cara Tercepat)

Cara termudah untuk mendapatkan PostgreSQL dan Redis yang berjalan di lokal adalah menggunakan Docker Compose yang sudah disiapkan.

```bash
# Jalankan PostgreSQL dan Redis di background
docker-compose up -d

# Verifikasi kedua container berjalan
docker-compose ps
```

Setelah perintah di atas, PostgreSQL tersedia di `localhost:5432` dan Redis di `localhost:6379`.

---

## 4. Konfigurasi Database

### Langkah 4.1 — Salin File Environment Backend

```bash
cd apps/backend

# Salin template environment file
cp .env.example .env
```

### Langkah 4.2 — Isi Konfigurasi Database

Edit file `apps/backend/.env` dan sesuaikan nilai-nilainya:

```env
# Koneksi PostgreSQL
# Format: postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
DATABASE_URL="postgresql://rocket_user:rocket_pass@localhost:5432/rocket_db?schema=public"
```

### Langkah 4.3 — Buat Database

Jika menggunakan Docker Compose, database sudah dibuat otomatis dari konfigurasi. Jika PostgreSQL diinstall manual:

```bash
# Masuk ke psql sebagai superuser
sudo -u postgres psql

# Buat user dan database
CREATE USER rocket_user WITH PASSWORD 'rocket_pass';
CREATE DATABASE rocket_db OWNER rocket_user;
GRANT ALL PRIVILEGES ON DATABASE rocket_db TO rocket_user;

# Keluar dari psql
\q
```

### Langkah 4.4 — Jalankan Migrasi Database

Migrasi akan membuat semua tabel di database sesuai dengan schema Prisma.

```bash
cd apps/backend

# Jalankan migrasi (membuat semua tabel)
npx prisma migrate dev --name init

# Generate Prisma Client (type-safe database client)
npx prisma generate
```

### Langkah 4.5 — Jalankan Seeding Data Awal

```bash
# Isi data awal: users, link penting, dll
npx prisma db seed
```

### Langkah 4.6 — Verifikasi Database (Opsional)

Prisma menyediakan Prisma Studio, sebuah GUI sederhana untuk melihat dan mengedit data database langsung dari browser.

```bash
# Buka Prisma Studio di browser (http://localhost:5555)
npx prisma studio
```

---

## 5. Konfigurasi Backend NestJS

### Langkah 5.1 — Isi Seluruh Environment Variables Backend

Edit `apps/backend/.env` dan isi semua variabel berikut:

```env
# ================================================================
# SERVER
# ================================================================
PORT=3001
NODE_ENV=development

# ================================================================
# DATABASE
# ================================================================
DATABASE_URL="postgresql://rocket_user:rocket_pass@localhost:5432/rocket_db?schema=public"

# ================================================================
# JWT (JSON Web Token)
# Ganti JWT_SECRET dengan string random minimal 64 karakter
# Generate dengan: openssl rand -hex 64
# ================================================================
JWT_SECRET="ganti-dengan-string-random-sangat-panjang-minimal-64-karakter-untuk-keamanan"
JWT_EXPIRES_IN="8h"

# ================================================================
# LDAP / ACTIVE DIRECTORY
# ================================================================
LDAP_URL="ldap://ad.yourcompany.co.id"
LDAP_BASE_DN="DC=yourcompany,DC=co,DC=id"
LDAP_BIND_DN="CN=svc-rocket,OU=ServiceAccounts,DC=yourcompany,DC=co,DC=id"
LDAP_BIND_PASSWORD="your-ldap-service-account-password"
# Format user DN untuk bind saat login
# Contoh: {username}@yourcompany.co.id atau CN={username},OU=Users,DC=yourcompany,DC=co,DC=id
LDAP_USER_DN_FORMAT="{username}@yourcompany.co.id"

# ================================================================
# SMTP — Email Notifikasi
# ================================================================
SMTP_HOST="mail.yourcompany.co.id"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="noreply@yourcompany.co.id"
SMTP_PASS="your-email-password"
SMTP_FROM="ROCKET APP <noreply@yourcompany.co.id>"

# ================================================================
# REDIS — Cache & Session
# ================================================================
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# ================================================================
# FILE UPLOAD
# ================================================================
UPLOAD_DEST="./uploads"
MAX_FILE_SIZE_MB=10

# ================================================================
# FRONTEND URL (untuk CORS)
# ================================================================
FRONTEND_URL="http://localhost:5173"
```

### Langkah 5.2 — Install Package Backend

Berikut adalah seluruh package yang diperlukan backend beserta perintah instalasinya:

```bash
cd apps/backend

# --- Core NestJS ---
npm install @nestjs/core @nestjs/common @nestjs/platform-express rxjs reflect-metadata

# --- Konfigurasi ---
npm install @nestjs/config

# --- Database & ORM ---
npm install @prisma/client
npm install -D prisma

# --- Autentikasi JWT ---
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm install -D @types/passport-jwt

# --- LDAP Active Directory ---
npm install ldapjs
npm install -D @types/ldapjs

# --- Validasi DTO ---
npm install class-validator class-transformer

# --- File Upload ---
npm install @nestjs/serve-static multer
npm install -D @types/multer

# --- Export PDF ---
npm install puppeteer

# --- Export Excel ---
npm install exceljs

# --- Email Notifikasi ---
npm install nodemailer @nestjs-modules/mailer handlebars
npm install -D @types/nodemailer

# --- Scheduler (Cron Job) ---
npm install @nestjs/schedule
npm install -D @types/cron

# --- Cache dengan Redis ---
npm install @nestjs/cache-manager cache-manager ioredis

# --- Dokumentasi API otomatis ---
npm install @nestjs/swagger swagger-ui-express

# --- Security ---
npm install helmet
npm install express-rate-limit

# --- Dev Dependencies ---
npm install -D @nestjs/cli @nestjs/testing ts-jest jest @types/jest supertest @types/supertest
```

### Langkah 5.3 — Struktur `main.ts` Lengkap

File `apps/backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ---- Keamanan ----
  // Helmet menambahkan berbagai HTTP headers keamanan secara otomatis
  app.use(helmet());

  // ---- CORS ----
  // Izinkan request dari frontend URL yang dikonfigurasi
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // ---- Global Prefix ----
  // Semua route API diawali dengan /api, contoh: /api/projects
  app.setGlobalPrefix('api');

  // ---- Validasi Global ----
  // Setiap DTO yang masuk akan divalidasi otomatis
  // whitelist: true → field yang tidak ada di DTO akan dibuang
  // forbidNonWhitelisted: true → error jika ada field tidak dikenal
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true, // Otomatis konversi tipe data (string "123" → number 123)
  }));

  // ---- Swagger (Dokumentasi API) ----
  // Tersedia di /api/docs saat NODE_ENV bukan production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ROCKET API')
      .setDescription('API Dokumentasi Aplikasi ROCKET — PT ASABRI (Persero)')
      .setVersion('1.0')
      .addBearerAuth() // Tombol Authorize di Swagger untuk JWT
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 ROCKET Backend berjalan di: http://localhost:${port}/api`);
  console.log(`📚 Dokumentasi API: http://localhost:${port}/api/docs`);
}

bootstrap();
```

---

## 6. Konfigurasi Frontend React

### Langkah 6.1 — Salin File Environment Frontend

```bash
cd apps/frontend
cp .env.example .env
```

### Langkah 6.2 — Isi Environment Variables Frontend

```env
# URL backend API — saat development, Vite proxy akan menangani ini
VITE_API_BASE_URL=http://localhost:3001/api

# Nama aplikasi
VITE_APP_NAME=ROCKET

# Nama perusahaan
VITE_APP_COMPANY=PT ASABRI (Persero)
```

### Langkah 6.3 — Install Package Frontend

```bash
cd apps/frontend

# --- Core React ---
npm install react react-dom
npm install -D @vitejs/plugin-react vite

# --- Routing ---
npm install react-router-dom

# --- State Management ---
npm install zustand

# --- HTTP Client ---
npm install axios

# --- UI Component Library ---
npm install antd @ant-design/icons

# --- Chart ---
npm install recharts

# --- Tabel dengan fitur sorting & filtering ---
npm install @tanstack/react-table

# --- Form & Validasi ---
npm install react-hook-form @hookform/resolvers zod

# --- Tanggal & Kalender ---
npm install dayjs

# --- Export trigger di FE (download file) ---
npm install file-saver
npm install -D @types/file-saver

# --- Dev Tools ---
npm install -D typescript @types/react @types/react-dom
npm install -D tailwindcss postcss autoprefixer
```

### Langkah 6.4 — Inisialisasi Tailwind CSS

```bash
cd apps/frontend

# Inisialisasi konfigurasi Tailwind
npx tailwindcss init -p
```

Edit `apps/frontend/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  // Tailwind akan men-scan file-file ini untuk mendeteksi class yang digunakan
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Warna brand ASABRI — disesuaikan dengan identitas visual perusahaan
      colors: {
        'asabri-blue':   '#0D2B6B',  // Biru tua ASABRI (dari logo)
        'asabri-gold':   '#C9A227',  // Emas ASABRI (dari logo)
        'asabri-light':  '#E8EEF8',  // Biru muda untuk background
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
  // Penting: matikan reset Tailwind agar tidak konflik dengan Ant Design
  corePlugins: {
    preflight: false,
  },
}

export default config
```

### Langkah 6.5 — Setup Axios Instance

File `apps/frontend/src/services/api.ts`:

```typescript
import axios from 'axios';

// Buat instance Axios dengan konfigurasi default
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000, // 30 detik timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR — dijalankan sebelum setiap request dikirim
api.interceptors.request.use(
  (config) => {
    // Ambil JWT token dari localStorage dan lampirkan ke header Authorization
    const token = localStorage.getItem('rocket_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR — dijalankan setelah setiap response diterima
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired atau invalid → logout otomatis dan redirect ke login
      localStorage.removeItem('rocket_token');
      localStorage.removeItem('rocket_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 7. Konfigurasi LDAP Active Directory

### Langkah 7.1 — Implementasi `ldap.service.ts`

File `apps/backend/src/modules/auth/ldap.service.ts`:

```typescript
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Verifikasi username dan password pengguna ke Active Directory.
   * Jika berhasil, kembalikan atribut user dari AD (email, nama, dll).
   * Jika gagal, lempar UnauthorizedException.
   */
  async authenticate(username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const ldapUrl      = this.configService.get('LDAP_URL');
      const userDnFormat = this.configService.get('LDAP_USER_DN_FORMAT');
      const baseDn       = this.configService.get('LDAP_BASE_DN');

      // Format user DN — contoh: budi.santoso@yourcompany.co.id
      const userDn = userDnFormat.replace('{username}', username);

      // Buat koneksi LDAP baru untuk setiap percobaan login
      const client = ldap.createClient({ url: ldapUrl });

      client.on('error', (err) => {
        this.logger.error(`Koneksi LDAP error: ${err.message}`);
        reject(new UnauthorizedException('Tidak dapat terhubung ke server autentikasi'));
      });

      // Coba bind (login) menggunakan kredensial user
      client.bind(userDn, password, (bindErr) => {
        if (bindErr) {
          this.logger.warn(`Login gagal untuk user: ${username}`);
          client.destroy();
          reject(new UnauthorizedException('Username atau password salah'));
          return;
        }

        // Bind berhasil → cari atribut user di direktori
        const searchOptions: ldap.SearchOptions = {
          filter: `(sAMAccountName=${username})`,  // Filter berdasarkan username Windows
          scope: 'sub',
          attributes: ['mail', 'displayName', 'sAMAccountName'],
        };

        client.search(baseDn, searchOptions, (searchErr, res) => {
          if (searchErr) {
            client.destroy();
            reject(new UnauthorizedException('Gagal mengambil data user'));
            return;
          }

          let userEntry: any = null;

          res.on('searchEntry', (entry) => {
            userEntry = {
              ad_username : entry.object['sAMAccountName'] as string,
              email       : entry.object['mail'] as string,
              full_name   : entry.object['displayName'] as string,
            };
          });

          res.on('end', () => {
            client.destroy();
            if (userEntry) {
              resolve(userEntry);
            } else {
              reject(new UnauthorizedException('Data user tidak ditemukan di direktori'));
            }
          });

          res.on('error', () => {
            client.destroy();
            reject(new UnauthorizedException('Error saat mencari data user'));
          });
        });
      });
    });
  }
}
```

### Langkah 7.2 — Testing Koneksi LDAP

Sebelum deployment, test koneksi LDAP menggunakan `ldapsearch` dari terminal:

```bash
# Test koneksi dan autentikasi ke AD
ldapsearch \
  -H ldap://ad.yourcompany.co.id \
  -D "testuser@yourcompany.co.id" \
  -w "passworduser" \
  -b "DC=yourcompany,DC=co,DC=id" \
  "(sAMAccountName=testuser)" \
  mail displayName sAMAccountName
```

---

## 8. Konfigurasi Email SMTP

### Langkah 8.1 — Setup Nodemailer di NestJS

File `apps/backend/src/modules/notifications/notifications.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host    : config.get('SMTP_HOST'),
          port    : parseInt(config.get('SMTP_PORT')),
          secure  : config.get('SMTP_SECURE') === 'true',
          auth: {
            user  : config.get('SMTP_USER'),
            pass  : config.get('SMTP_PASS'),
          },
        },
        defaults: {
          from    : config.get('SMTP_FROM'),
        },
        template: {
          // Lokasi folder template email Handlebars
          dir     : join(__dirname, 'templates'),
          adapter : new HandlebarsAdapter(),
          options : { strict: true },
        },
      }),
    }),
  ],
})
export class NotificationsModule {}
```

---

## 9. Menjalankan Aplikasi (Development)

### Menjalankan Semua Sekaligus (Dari Root)

Jika menggunakan Turborepo, cukup satu perintah dari root:

```bash
# Dari root directory — menjalankan frontend & backend paralel
npm run dev
```

Konfigurasi `turbo.json` di root:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

### Menjalankan Secara Terpisah

```bash
# Terminal 1 — Jalankan Backend NestJS
cd apps/backend
npm run start:dev

# Terminal 2 — Jalankan Frontend React
cd apps/frontend
npm run dev
```

### URL yang Aktif Saat Development

| Service | URL | Keterangan |
|---|---|---|
| Frontend React | http://localhost:5173 | Halaman utama aplikasi |
| Backend NestJS | http://localhost:3001/api | REST API endpoint |
| Swagger Docs | http://localhost:3001/api/docs | Dokumentasi API interaktif |
| Prisma Studio | http://localhost:5555 | GUI database (jalankan manual) |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |

---

## 10. Build & Deployment Production

### Langkah 10.1 — Build Frontend

```bash
cd apps/frontend

# Build menghasilkan folder dist/ berisi file HTML, CSS, JS yang sudah dioptimasi
npm run build

# Cek ukuran output bundle (pastikan tidak terlalu besar)
npm run build && npx vite-bundle-visualizer
```

Hasil build ada di `apps/frontend/dist/`. Folder ini yang akan di-serve oleh Nginx.

### Langkah 10.2 — Build Backend

```bash
cd apps/backend

# Build TypeScript menjadi JavaScript di folder dist/
npm run build
```

### Langkah 10.3 — Jalankan Backend dengan PM2

PM2 adalah process manager untuk Node.js yang memastikan aplikasi berjalan terus dan restart otomatis jika crash.

```bash
# Install PM2 secara global di server production
npm install -g pm2

# Jalankan backend dengan PM2
pm2 start dist/main.js --name "rocket-backend" --env production

# Set PM2 agar auto-start ketika server reboot
pm2 startup
pm2 save

# Monitor status aplikasi
pm2 status
pm2 logs rocket-backend
```

File konfigurasi PM2 `ecosystem.config.js` di root:

```javascript
module.exports = {
  apps: [{
    name       : 'rocket-backend',
    script     : 'apps/backend/dist/main.js',
    instances  : 'max',         // Jalankan sebanyak jumlah CPU core
    exec_mode  : 'cluster',     // Mode cluster untuk load balancing
    env_production: {
      NODE_ENV  : 'production',
      PORT      : 3001,
    },
    error_file  : '/var/log/rocket/err.log',
    out_file    : '/var/log/rocket/out.log',
    merge_logs  : true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};

// Jalankan dengan: pm2 start ecosystem.config.js --env production
```

---

## 11. Docker Setup Lengkap

### `docker-compose.yml` (Development)

```yaml
version: '3.9'

services:
  # ---- PostgreSQL Database ----
  postgres:
    image: postgres:16-alpine
    container_name: rocket_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER     : rocket_user
      POSTGRES_PASSWORD : rocket_pass
      POSTGRES_DB       : rocket_db
    ports:
      - "5432:5432"
    volumes:
      # Data PostgreSQL disimpan di volume agar tidak hilang saat container restart
      - rocket_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test        : ["CMD-SHELL", "pg_isready -U rocket_user -d rocket_db"]
      interval    : 10s
      timeout     : 5s
      retries     : 5

  # ---- Redis Cache ----
  redis:
    image: redis:7-alpine
    container_name: rocket_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - rocket_redis_data:/data
    command: redis-server --appendonly yes  # Persistensi data Redis

  # ---- Prisma Studio (GUI Database, hanya untuk development) ----
  prisma_studio:
    image: node:20-alpine
    container_name: rocket_prisma_studio
    working_dir: /app
    volumes:
      - ./apps/backend:/app
    command: npx prisma studio
    ports:
      - "5555:5555"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgresql://rocket_user:rocket_pass@postgres:5432/rocket_db?schema=public"
    profiles: ["studio"]  # Hanya jalan jika dipanggil: docker-compose --profile studio up

volumes:
  rocket_postgres_data:
  rocket_redis_data:
```

### `docker-compose.prod.yml` (Production — Full Stack)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: rocket_postgres_prod
    restart: always
    environment:
      POSTGRES_USER     : ${DB_USER}
      POSTGRES_PASSWORD : ${DB_PASS}
      POSTGRES_DB       : ${DB_NAME}
    volumes:
      - rocket_postgres_data:/var/lib/postgresql/data
    networks:
      - rocket_network
    # Port TIDAK diexpose ke luar — hanya bisa diakses oleh container lain dalam network yang sama
    expose:
      - "5432"

  redis:
    image: redis:7-alpine
    container_name: rocket_redis_prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - rocket_redis_data:/data
    networks:
      - rocket_network
    expose:
      - "6379"

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
    container_name: rocket_backend_prod
    restart: always
    env_file: ./apps/backend/.env.production
    environment:
      DATABASE_URL : "postgresql://${DB_USER}:${DB_PASS}@postgres:5432/${DB_NAME}?schema=public"
      REDIS_HOST   : redis
    depends_on:
      - postgres
      - redis
    networks:
      - rocket_network
    expose:
      - "3001"
    volumes:
      - rocket_uploads:/app/uploads

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
    container_name: rocket_frontend_prod
    restart: always
    networks:
      - rocket_network
    expose:
      - "80"

  nginx:
    image: nginx:1.25-alpine
    container_name: rocket_nginx_prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - rocket_network

networks:
  rocket_network:
    driver: bridge

volumes:
  rocket_postgres_data:
  rocket_redis_data:
  rocket_uploads:
```

### `Dockerfile` Backend

File `apps/backend/Dockerfile`:

```dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production
WORKDIR /app

# Install Chromium untuk Puppeteer (PDF generation)
RUN apk add --no-cache chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Jalankan migrasi terlebih dahulu sebelum start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

### `Dockerfile` Frontend

File `apps/frontend/Dockerfile`:

```dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Serve dengan Nginx ----
FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html

# Konfigurasi Nginx untuk SPA React (semua route ke index.html)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 12. Konfigurasi Nginx (Reverse Proxy)

File `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # ---- Logging ----
    access_log  /var/log/nginx/access.log;
    error_log   /var/log/nginx/error.log;

    # ---- Gzip Compression — mempercepat loading ----
    gzip         on;
    gzip_vary    on;
    gzip_types   text/plain text/css application/json application/javascript
                 text/xml application/xml application/xml+rss text/javascript;

    # ---- Limit ukuran upload (sesuai MAX_FILE_SIZE_MB) ----
    client_max_body_size 10M;

    server {
        listen 443 ssl http2;
        server_name rocket.asabri.co.id;  # Ganti dengan domain aktual

        ssl_certificate     /etc/nginx/ssl/rocket.asabri.co.id.crt;
        ssl_certificate_key /etc/nginx/ssl/rocket.asabri.co.id.key;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # ---- Security Headers ----
        add_header X-Frame-Options          "SAMEORIGIN" always;
        add_header X-XSS-Protection         "1; mode=block" always;
        add_header X-Content-Type-Options   "nosniff" always;
        add_header Referrer-Policy          "no-referrer-when-downgrade" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # ---- Serve Frontend (React build) ----
        location / {
            root   /usr/share/nginx/html;
            index  index.html;
            # Penting untuk SPA: semua route dikembalikan ke index.html
            # agar React Router yang menangani navigasi
            try_files $uri $uri/ /index.html;

            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # ---- Proxy ke Backend API ----
        location /api/ {
            proxy_pass         http://backend:3001;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade           $http_upgrade;
            proxy_set_header   Connection        'upgrade';
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 90;
        }
    }

    # ---- Redirect HTTP ke HTTPS ----
    server {
        listen 80;
        server_name rocket.asabri.co.id;
        return 301 https://$server_name$request_uri;
    }
}
```

---

## 13. Troubleshooting Umum

**Problem: `prisma migrate dev` gagal dengan error "database does not exist"**
Pastikan PostgreSQL berjalan dan database `rocket_db` sudah dibuat. Cek kembali nilai `DATABASE_URL` di `.env`. Jika menggunakan Docker, pastikan container postgres sudah berjalan dengan `docker-compose ps`.

**Problem: Login gagal dengan error LDAP "ECONNREFUSED"**
Server LDAP tidak bisa diakses. Cek apakah mesin development berada di jaringan intranet ASABRI (terhubung VPN jika remote). Verifikasi nilai `LDAP_URL` di `.env`. Test manual dengan perintah `ldapsearch` seperti di Langkah 7.2.

**Problem: Frontend menampilkan "Network Error" saat memanggil API**
Cek apakah backend berjalan di port yang benar (`localhost:3001`). Pastikan konfigurasi proxy di `vite.config.ts` sudah benar. Cek browser console untuk melihat error detail.

**Problem: Email notifikasi tidak terkirim**
Verifikasi konfigurasi SMTP di `.env`. Test menggunakan tool seperti Mailtrap untuk development. Pastikan port SMTP (587 atau 465) tidak diblokir firewall server.

**Problem: Export PDF menghasilkan file kosong atau gagal**
Puppeteer memerlukan Chromium terinstall. Di server Linux, jalankan: `sudo apt-get install -y chromium-browser`. Set environment variable `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`.

**Problem: `npm install` gagal dengan error permission**
Jangan jalankan `npm install` dengan sudo. Jika ada masalah permission di folder `node_modules`, hapus dulu foldernya: `rm -rf node_modules && npm install`.

---

## 14. Checklist Go-Live

Gunakan checklist ini sebelum aplikasi diluncurkan ke production:

- [ ] Semua environment variables production sudah diisi dan tidak ada yang menggunakan nilai development
- [ ] `JWT_SECRET` sudah diganti dengan string random yang panjang dan kuat
- [ ] Koneksi LDAP sudah ditest dengan akun karyawan asli
- [ ] Email notifikasi sudah ditest dan terkirim dengan benar
- [ ] Semua migrasi database sudah dijalankan (`prisma migrate deploy`)
- [ ] Data seed sudah dijalankan (20 link penting, data user awal)
- [ ] Backup database otomatis sudah dikonfigurasi
- [ ] SSL certificate sudah terpasang dan HTTPS aktif
- [ ] Nginx sudah dikonfigurasi dan redirect HTTP ke HTTPS berjalan
- [ ] PM2 sudah dikonfigurasi untuk auto-start setelah server reboot
- [ ] Firewall server hanya membuka port 80, 443, dan SSH (22)
- [ ] Port database (5432) dan Redis (6379) TIDAK diexpose ke internet
- [ ] Log aplikasi sudah diarahkan ke file yang bisa dimonitor
- [ ] Test login dengan beberapa akun dari level yang berbeda (Staff, Kabid, Sesper, Super User)
- [ ] Test alur lengkap: buat project → ajukan review → approve → status berubah FINISHED
- [ ] Test notifikasi H-3: set due date project 3 hari dari sekarang dan pastikan notifikasi muncul
- [ ] Test export PDF, Excel, dan CSV dari tabel working tracker
- [ ] Test dashboard dan pastikan semua grafik menampilkan data yang benar
- [ ] Dokumentasikan URL aplikasi, kredensial admin awal, dan prosedur backup kepada tim IT ASABRI
