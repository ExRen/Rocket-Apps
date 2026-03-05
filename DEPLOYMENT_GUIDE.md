# 🚀 ROCKET Apps — Panduan Deploy & Setup LDAP

## A. Deploy ke Vercel

### ⚠️ PENTING: Arsitektur saat ini

Aplikasi ROCKET terdiri dari **2 bagian terpisah**:

| Komponen | Tech Stack | Bisa di Vercel? |
|----------|-----------|----------------|
| **Frontend** (`apps/frontend`) | Vite + React | ✅ Ya (static/SPA) |
| **Backend** (`apps/backend`) | NestJS (server) | ❌ Tidak langsung* |

> [!IMPORTANT]
> **Vercel dirancang untuk frontend/serverless.** Backend NestJS adalah server persistent (long-running), jadi **tidak bisa langsung di-deploy ke Vercel**. Backend perlu di-host di platform lain.

---

### Opsi 1: Frontend di Vercel + Backend di Railway/Render (⭐ Direkomendasikan)

#### Step 1 — Deploy Backend ke Railway

1. Buka [railway.app](https://railway.app), login dengan GitHub
2. **New Project** → **Deploy from GitHub Repo**
3. Pilih repo `Rocket_Apps`
4. Set:
   - **Root Directory:** `apps/backend`
   - **Build Command:** `npx prisma generate && npm run build`
   - **Start Command:** `node dist/main.js`
5. **Variables** — tambahkan:
   ```
   DATABASE_URL=postgres://....(connection string Prisma DB kamu)
   JWT_SECRET=ganti-dengan-string-random-64-char
   JWT_EXPIRES_IN=8h
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://rocket-app.vercel.app
   ```
6. Railway akan memberikan URL seperti: `https://rocket-backend-xxx.up.railway.app`

#### Step 2 — Deploy Frontend ke Vercel

1. Buka [vercel.com](https://vercel.com), login dengan GitHub
2. **Import Project** → pilih repo `Rocket_Apps`
3. Set:
   - **Root Directory:** `apps/frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   ```
   VITE_API_BASE_URL=https://rocket-backend-xxx.up.railway.app/api
   ```
5. Deploy!

> [!NOTE]
> File `apps/frontend/src/services/api.ts` **sudah mendukung** `VITE_API_BASE_URL`.
> - **Development:** Fallback ke `/api` (Vite proxy → `localhost:3001`)
> - **Production:** Langsung ke URL backend di Railway

---

### Opsi 2: Full Deploy ke Railway (Monorepo)

Jika ingin deploy semuanya di satu tempat:

1. Railway dapat menjalankan **multiple services** dari satu repo
2. Buat 2 service: satu untuk `apps/backend`, satu untuk `apps/frontend`
3. Frontend bisa di-build sebagai static dan di-serve oleh backend

---

### Opsi 3: Deploy ke VPS / Server ASABRI (untuk Production)

Karena ada LDAP (Active Directory ASABRI), opsi terbaik untuk **production** adalah:

```bash
# 1. Clone ke server
git clone <repo> /opt/rocket-apps
cd /opt/rocket-apps

# 2. Install deps
npm install

# 3. Build
cd apps/backend && npx prisma generate && npm run build
cd ../frontend && npm run build

# 4. Jalankan dengan PM2
pm2 start apps/backend/dist/main.js --name rocket-backend
pm2 serve apps/frontend/dist 5173 --name rocket-frontend --spa

# 5. Setup Nginx reverse proxy
# /etc/nginx/sites-available/rocket
```

```nginx
server {
    listen 80;
    server_name rocket.asabri.co.id;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## B. Setup LDAP / Active Directory

### Cara Kerja LDAP di ROCKET

```
User masukkan username + password
        ↓
LdapService.authenticate()
        ↓
    ┌──────────────┐
    │ Bind ke AD   │ ← username@asabri.co.id + password
    │ (verifikasi) │
    └──────────────┘
        ↓ (berhasil)
    ┌──────────────┐
    │ Search user  │ ← cari atribut: mail, displayName, sAMAccountName
    └──────────────┘
        ↓
    ┌──────────────────┐
    │ Upsert ke DB     │ ← JIT provisioning: buat/update user di Prisma
    │ (auto-register)  │
    └──────────────────┘
        ↓
    Return JWT Token
```

### Environment Variables untuk LDAP

Di file `apps/backend/.env`:

```env
# URL server Active Directory
LDAP_URL="ldap://ad.asabri.co.id"

# Base DN — root dari directory tree
LDAP_BASE_DN="DC=asabri,DC=co,DC=id"

# Format DN untuk user login
LDAP_USER_DN_FORMAT="{username}@asabri.co.id"

# (Opsional) Service account untuk bind awal sebelum search
LDAP_BIND_DN="CN=svc-rocket,OU=ServiceAccounts,DC=asabri,DC=co,DC=id"
LDAP_BIND_PASSWORD="password-service-account-ldap"
```

### Cara Mendapatkan Nilai-Nilai LDAP

| Variable | Cara Cari | Contoh |
|----------|----------|--------|
| `LDAP_URL` | Tanya tim IT / network admin. Format: `ldap://hostname` atau `ldaps://hostname:636` | `ldap://ad.asabri.co.id` |
| `LDAP_BASE_DN` | Dari domain. `asabri.co.id` → `DC=asabri,DC=co,DC=id` | `DC=asabri,DC=co,DC=id` |
| `LDAP_USER_DN_FORMAT` | Biasanya `{username}@domain` untuk AD | `{username}@asabri.co.id` |
| `LDAP_BIND_DN` | Minta IT buat service account khusus untuk ROCKET | `CN=svc-rocket,OU=...` |
| `LDAP_BIND_PASSWORD` | Password dari service account di atas | *(confidential)* |

### Verifikasi LDAP (Testing)

```bash
# Test dari command line (jika ada ldapsearch)
ldapsearch -x -H ldap://ad.asabri.co.id \
  -D "testuser@asabri.co.id" \
  -w "password123" \
  -b "DC=asabri,DC=co,DC=id" \
  "(sAMAccountName=testuser)" \
  mail displayName sAMAccountName
```

### Mode Development (Tanpa LDAP)

Jika LDAP tidak tersedia (development/testing), backend **otomatis fallback**:

1. Coba autentikasi ke AD
2. Jika gagal (AD tidak bisa diakses) → **password apapun diterima**
3. Cari user di database berdasarkan `ad_username`
4. Jika username = `admin` dan belum ada → auto-create user SUPER_USER
5. Jika user tidak ditemukan → error

> [!TIP]
> **Di dev mode**, cukup gunakan username dari seed data:
> - `dwi.soelistijanto` (SUPER_USER)
> - `okki.jatnika` (LEVEL_1)
> - `kartika.rahmadayanti` (LEVEL_2)
> - `andris.framono` (LEVEL_3)
> 
> Password: **apapun** (karena LDAP di-skip)

### Untuk Production: Checklist LDAP

- [ ] Pastikan server ROCKET bisa akses `ldap://ad.asabri.co.id` (port 389 atau 636)
- [ ] Minta IT buat service account (`svc-rocket`) dengan permission **read** ke user directory
- [ ] Test koneksi LDAP pakai `ldapsearch` atau tool seperti Apache Directory Studio
- [ ] Update `.env` dengan credential yang benar
- [ ] Set `NODE_ENV=production` — ini menghilangkan dev fallback (password apapun diterima)
- [ ] Jika menggunakan LDAPS (SSL), ganti port ke 636: `ldaps://ad.asabri.co.id:636`
