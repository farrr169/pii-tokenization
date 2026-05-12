# 🔐 Dynamic PII Tokenization System

> **Dynamic PII Tokenization System menggunakan FPE (Format-Preserving Encryption) + Tweak**
> 
> Stack: PostgreSQL · Express.js · React.js · Node.js (PERN Stack)

---

## 📋 Daftar Isi

- [Gambaran Sistem](#gambaran-sistem)
- [Arsitektur](#arsitektur)
- [Fitur Utama](#fitur-utama)
- [Struktur Folder](#struktur-folder)
- [Cara Setup](#cara-setup)
- [API Endpoints](#api-endpoints)
- [Akun Default](#akun-default)

---

## 🎯 Gambaran Sistem

Sistem tokenisasi PII (Personally Identifiable Information) yang dinamis menggunakan algoritma **Format-Preserving Encryption (FPE)** dengan dukungan **Tweak** untuk menghasilkan token yang:

- ✅ **Mempertahankan format** asli data (panjang, charset)
- ✅ **Configurable** prefix/suffix preservation  
- ✅ **Multiple metode**: FF1, FF3, Masking, Hashing, Random
- ✅ **Tweak support**: Static, Dynamic, Randomized, User-Based
- ✅ **RBAC**: Admin, Operator, Auditor, Viewer
- ✅ **Audit trail** lengkap setiap aktivitas
- ✅ **Batch processing** untuk volume besar

---

## 🏗️ Arsitektur

```
React Frontend (Vite + Tailwind)
        ↓ HTTP / REST API
Express.js Backend (Node.js)
        ↓
   Service Layer
   ├── FPE Engine (FF1/FF3)
   ├── Tweak Engine
   ├── Masking Service
   └── Audit Service
        ↓
   PostgreSQL (Prisma ORM)
   Redis (Queue/Cache - opsional)
```

---

## ✨ Fitur Utama

### Tokenisasi
| Metode | Deskripsi | Deterministik | Tweak |
|--------|-----------|--------------|-------|
| Full FPE FF1 | Format-Preserving Encryption FF1 | ✅ | ✅ |
| Full FPE FF3 | Format-Preserving Encryption FF3-1 | ✅ | ✅ |
| Partial FPE | FPE dengan preserve prefix/suffix | ✅ | ✅ |
| Masking | Ganti dengan karakter `*` | ❌ | ❌ |
| Hashing SHA-256 | One-way hash | ✅ | ❌ |
| Random Token | Token acak | ❌ | ❌ |

### PII Types yang Didukung
- **Identitas**: NIK, Passport, Nama Lengkap
- **Finansial**: Nomor Rekening, Kartu Kredit
- **Pajak**: NPWP
- **Kontak**: Nomor Telepon, Email

### Tweak Types
- `STATIC` — Nilai tetap yang sama setiap waktu
- `DYNAMIC` — Berubah berdasarkan timestamp
- `RANDOMIZED` — Acak 8 byte setiap eksekusi  
- `USER_BASED` — Unik per user ID

---

## 📁 Struktur Folder

```
tokenization-system/
├── database/
│   └── schema.sql              # DDL lengkap + seed data
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Prisma client singleton
│   │   ├── modules/
│   │   │   ├── auth/           # Login, register, JWT
│   │   │   ├── users/          # CRUD users
│   │   │   ├── roles/          # CRUD roles
│   │   │   ├── pii-types/      # Master PII types
│   │   │   ├── tokenization-methods/
│   │   │   ├── tokenization-rules/
│   │   │   ├── tweaks/
│   │   │   ├── tokenization/   # Core engine
│   │   │   │   ├── fpe.service.js     # FPE algorithm
│   │   │   │   ├── tokenization.controller.js
│   │   │   │   └── tokenization.routes.js
│   │   │   ├── jobs/
│   │   │   ├── audit-logs/
│   │   │   └── settings/
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js   # JWT verify
│   │   │   ├── role.middleware.js   # RBAC
│   │   │   └── error.middleware.js
│   │   ├── utils/
│   │   │   └── crud.factory.js  # Generic CRUD factory
│   │   ├── database/
│   │   │   └── seed.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios + API services
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, DashboardLayout
│   │   │   └── ui/             # Reusable components
│   │   ├── pages/
│   │   │   ├── auth/Login.jsx
│   │   │   ├── dashboard/Dashboard.jsx
│   │   │   ├── pii/ tweaks/ rules/ jobs/
│   │   │   ├── audit/ settings/ access/
│   │   │   └── (Demo POC di App.jsx)
│   │   ├── store/
│   │   │   └── auth.store.js   # Zustand auth state
│   │   ├── App.jsx             # Router + halaman
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Cara Setup

### Prasyarat
- Node.js >= 18
- PostgreSQL >= 14
- npm atau yarn

### 1. Clone & Install

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env sesuai konfigurasi database Anda
npm install
npx prisma generate
npx prisma migrate dev --name init
node src/database/seed.js

# Frontend
cd ../frontend
npm install
```

### 2. Jalankan Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Server: http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# App: http://localhost:3000
```

### 3. Jalankan dengan Docker

```bash
docker-compose up -d
# App: http://localhost:3000
# API: http://localhost:5000
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/profile` | Profile saya |

### Tokenisasi (Core)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/tokenization/tokenize` | Single tokenisasi |
| POST | `/api/tokenization/batch` | Batch tokenisasi |
| GET | `/api/tokenization/results` | List hasil |
| GET | `/api/tokenization/stats` | Statistik |

### Contoh Request

```json
POST /api/tokenization/tokenize
{
  "pii_type_id": "uuid-nik",
  "method_id": "uuid-ff1",
  "rule_id": "uuid-rule-nik",
  "value": "3276011203990001",
  "save_result": true
}
```

```json
Response:
{
  "status": "success",
  "data": {
    "tokenized_value": "327601A8F3X9Q2W1",
    "method_used": "Full FPE FF1",
    "tweak_used": "STATIC",
    "processing_time_ms": 12,
    "length_preserved": true
  }
}
```

### Master Data
| Endpoint | Deskripsi |
|----------|-----------|
| `/api/pii-types` | CRUD PII Types |
| `/api/tokenization-methods` | CRUD Methods |
| `/api/tokenization-rules` | CRUD Rules |
| `/api/tweaks` | CRUD Tweaks |
| `/api/users` | CRUD Users |
| `/api/roles` | CRUD Roles |
| `/api/audit-logs` | Audit Log (read only) |
| `/api/settings` | System Settings |
| `/api/jobs` | Batch Jobs |

---

## 👤 Akun Default

Setelah menjalankan seed:

| Email | Password | Role |
|-------|----------|------|
| `admin@system.id` | `Admin@12345` | Admin |

---

## ⚠️ Catatan Keamanan

1. **FPE Key** — Wajib ganti `fpe_key` di production dengan key yang kuat (256-bit AES)
2. **JWT Secret** — Ganti `JWT_SECRET` di `.env` dengan random string yang kuat
3. **Plaintext** — Sistem menyimpan `data_hash` bukan plaintext untuk referensi  
4. **HTTPS** — Selalu gunakan HTTPS di production
5. **Audit** — Semua aktivitas tercatat di `audit_logs`
6. **FPE Library** — Untuk production, gunakan implementasi NIST-compliant (NIST SP 800-38G)

---

## 📚 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Query, Zustand, Recharts |
| Backend | Node.js, Express.js, Prisma ORM, Zod validation |
| Database | PostgreSQL 16 |
| Auth | JWT, bcrypt |
| Security | Helmet, CORS, Rate Limiting, RBAC |
| DevOps | Docker, Docker Compose, Nginx |

---

*Dynamic PII Tokenization System — v1.0.0*
