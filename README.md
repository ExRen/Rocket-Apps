# 🚀 ROCKET — PT ASABRI (Persero)

**Rekapitulasi Online Catatan Kerja Elektronik Terpadu**

Aplikasi manajemen pekerjaan dan anggaran untuk Bidang Komunikasi dan Protokoler PT ASABRI (Persero).

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Ant Design
- **Backend:** NestJS + Prisma + PostgreSQL
- **Cache:** Redis
- **Auth:** LDAP Active Directory + JWT

## Quick Start

```bash
# Install dependencies
npm install

# Start PostgreSQL & Redis via Docker
docker-compose up -d

# Setup database
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed

# Run development
cd ../..
npm run dev
```

## URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Swagger Docs | http://localhost:3001/api/docs |

## Documentation

- [Project Structure](docs/project_tree.md)
- [Setup Guide](docs/setup_code.md)
- [Database Architecture](docs/database.md)
- [Module Reference](docs/modul.md)
