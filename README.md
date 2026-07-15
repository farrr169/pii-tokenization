# Dynamic PII Tokenization System

> **Dynamic PII Tokenization System menggunakan Format-Preserving Encryption FF1 + Tweak**
>
> Stack: PostgreSQL · Express.js · React.js · Node.js (PERN Stack)

---

## Daftar Isi

- [Gambaran Sistem](#gambaran-sistem)
- [Arsitektur](#arsitektur)
- [Fitur Utama](#fitur-utama)
- [RBAC & Hak Akses](#rbac--hak-akses)
- [Struktur Folder](#struktur-folder)
- [Cara Setup](#cara-setup)
- [API Endpoints](#api-endpoints)
- [Akun Default](#akun-default)
- [Catatan Keamanan](#catatan-keamanan)
- [Tech Stack](#tech-stack)

---

## Gambaran Sistem

Sistem tokenisasi PII (Personally Identifiable Information) yang dinamis menggunakan algoritma **Format-Preserving Encryption FF1** (NIST SP 800-38G) dengan dukungan **Tweak** untuk menghasilkan token yang:

- **Mempertahankan format** asli data (panjang karakter & charset)
- **Configurable** prefix/suffix preservation per rule
- **Satu algoritma ekslusif**: Full FPE FF1 — deterministik & format-preserving
- **Tweak support**: Static, Dynamic, Randomized, User-Based
- **RBAC** 4 peran: Admin, Operator, Auditor, Data Consumer
- **Audit trail** lengkap setiap aktivitas pengguna
- **Batch processing** hingga 1.000 data per job
- **Detokenisasi** terkontrol dengan log akses

---

## Arsitektur

```
React Frontend (Vite + Tailwind CSS + Zustand)
        ↓ HTTP / REST API (JWT Bearer)
Express.js Backend (Node.js 20)
        ↓
   Service Layer
   ├── FPE Engine (FF1 — AES-based Feistel + HMAC-SHA256 PRF)
   ├── Tweak Engine (Static / Dynamic / Randomized / User-Based)
   └── Audit Service
        ↓
   PostgreSQL 16 (Prisma ORM)
   Redis 7 (opsional — queue & cache)
        ↓
   Docker Compose (4 container: frontend · backend · db · redis)
```

---

## Fitur Utama

### Algoritma Tokenisasi

| Metode | Deskripsi | Deterministik | Format-Preserving | Tweak |
|--------|-----------|:------------:|:-----------------:|:-----:|
| **Full FPE FF1** | Format-Preserving Encryption FF1 (satu-satunya) | ✅ | ✅ | ✅ |

> Semua metode lain (FF3, Masking, Hashing, Random Token) telah dihapus. Sistem menggunakan eksklusif FF1.

### PII Types yang Didukung

| Kategori | Jenis Data |
|----------|------------|
| Identitas | NIK, Passport, Nama Lengkap, Kartu Keluarga |
| Finansial | Nomor Rekening, Kartu Kredit |
| Pajak | NPWP |
| Kontak | Nomor Telepon, Email |

### Tweak Types

| Tipe | Deskripsi |
|------|-----------|
| `STATIC` | Nilai tetap yang sama setiap eksekusi |
| `DYNAMIC` | Berubah berdasarkan timestamp |
| `RANDOMIZED` | 8 byte acak per eksekusi |
| `USER_BASED` | Unik per user ID yang menjalankan tokenisasi |

### Halaman Aplikasi

| Halaman | Path | Deskripsi |
|---------|------|-----------|
| Login | `/login` | Autentikasi JWT |
| Demo Tokenisasi | `/demo` | Simulasi + simpan ke DB |
| Detokenisasi | `/detokenize` | Lihat & reveal nilai asli |
| Hasil Tokenisasi | `/results` | List hasil + hapus (Admin) |
| PII Types | `/pii-types` | Master data tipe PII |
| Tokenization Rules | `/rules` | Konfigurasi rule per PII type |
| Tweaks | `/tweaks` | Kelola konfigurasi tweak |
| Jobs | `/jobs` | Riwayat batch job |
| Audit Log | `/audit` | Log seluruh aktivitas |
| Access Management | `/access` | Kelola user & role |
| Settings | `/settings` | Konfigurasi sistem |
| API Docs | `/api-docs` | Dokumentasi endpoint |

---

## RBAC & Hak Akses

| Fitur | Admin | Operator | Auditor | Data Consumer |
|-------|:-----:|:--------:|:-------:|:-------------:|
| Login / Autentikasi | ✅ | ✅ | ✅ | ✅ |
| Kelola PII Types | ✅ CRUD | 👁 Read | 👁 Read | 👁 Read |
| Lihat Metode Tokenisasi (FF1) | ✅ | ✅ | ✅ | ✅ |
| Kelola Tokenization Rules | ✅ CRUD | 👁 Read | 👁 Read | 👁 Read |
| Kelola Tweak | ✅ CRUD | 👁 Read | 👁 Read | 👁 Read |
| Demo Tokenisasi Single | ✅ | ✅ | ❌ | ❌ |
| Tokenisasi Batch | ✅ | ✅ | ❌ | ❌ |
| Lihat Hasil Tokenisasi | ✅ | ✅ | ✅ | ✅ |
| Detokenisasi | ✅ | ✅ | ❌ | ❌ |
| **Hapus Data Tokenisasi** | ✅ | ❌ | ❌ | ❌ |
| Lihat Audit Log | ✅ | ❌ | ✅ | ❌ |
| Kelola Pengaturan Sistem | ✅ R+W | ❌ | 👁 Read | ❌ |
| Kelola User & Role | ✅ | ❌ | 👁 Read | ❌ |

---

## Struktur Folder

```
pii-tokenization/
├── Diagram_UML_PII_Tokenization.md   # UML lengkap (5 diagram — Mermaid.js)
├── docker-compose.yml
├── database/
│   └── schema.sql                    # DDL lengkap
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Prisma client singleton
│   │   ├── modules/
│   │   │   ├── auth/                 # Login, register, JWT
│   │   │   ├── users/
│   │   │   │   ├── users.controller.js
│   │   │   │   └── users.routes.js
│   │   │   ├── roles/
│   │   │   ├── pii-types/
│   │   │   ├── tokenization-methods/
│   │   │   ├── tokenization-rules/
│   │   │   ├── tweaks/
│   │   │   ├── tokenization/
│   │   │   │   ├── fpe.service.js            # FF1 engine
│   │   │   │   ├── tokenization.controller.js
│   │   │   │   └── tokenization.routes.js
│   │   │   ├── audit-logs/
│   │   │   │   ├── audit-logs.service.js
│   │   │   │   └── audit-logs.routes.js
│   │   │   ├── jobs/
│   │   │   └── settings/
│   │   ├── jobs/
│   │   │   └── retention.job.js      # Auto-archiving audit logs
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # JWT verify
│   │   │   ├── role.middleware.js    # RBAC authorize()
│   │   │   └── error.middleware.js
│   │   ├── utils/
│   │   │   ├── crud.factory.js       # Generic CRUD router factory
│   │   │   └── auditLog.js           # auditFromReq() helper
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
│   │   ├── api/
│   │   │   ├── axios.js              # Axios instance + JWT interceptor
│   │   │   └── index.js             # Semua API service functions
│   │   ├── components/
│   │   │   ├── layout/              # Sidebar, DashboardLayout
│   │   │   └── ui/                  # DataTable, Modal, Badge, Button, dll
│   │   ├── pages/
│   │   │   ├── auth/                # Login
│   │   │   ├── demo/                # Demo tokenisasi + simpan ke DB
│   │   │   ├── detokenisasi/        # Reveal nilai asli token
│   │   │   ├── tweaks/              # Kelola tweak
│   │   │   ├── access/              # User & role management
│   │   │   ├── settings/            # System settings
│   │   │   └── api-docs/            # API documentation
│   │   ├── store/
│   │   │   ├── auth.store.js        # Zustand auth state
│   │   │   ├── permissions.store.js # RBAC permission helper
│   │   │   ├── rules.store.js       # Tokenization rules local state
│   │   │   ├── pii.store.js
│   │   │   └── audit.store.js
│   │   ├── App.jsx                  # Router + inline pages (PII, Rules, Jobs, Audit, Results)
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
│
└── README.md
```

---

## Cara Setup

### Prasyarat

- Node.js >= 18
- PostgreSQL >= 14
- npm

### 1. Clone & Install

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, FPE_KEY
npm install
npx prisma generate
npx prisma migrate dev --name init
node src/database/seed.js

# Frontend
cd ../frontend
npm install
```

### 2. Konfigurasi `.env` Backend

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/pii_tokenization
JWT_SECRET=ganti-dengan-random-string-kuat
JWT_EXPIRES_IN=7d
FPE_KEY=0123456789ABCDEF0123456789ABCDEF   # 32-char hex (256-bit)
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Jalankan Development

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# API: http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# App: http://localhost:3000
```

### 4. Jalankan dengan Docker

```bash
docker-compose up -d
# App:  http://localhost:3000
# API:  http://localhost:5000
```

---

## API Endpoints

### Auth

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| POST | `/api/auth/login` | Login, return JWT | Public |
| POST | `/api/auth/register` | Registrasi user baru | Public |
| GET | `/api/auth/profile` | Profil user login | All |

### Tokenisasi (Core)

| Method | Endpoint | Deskripsi | Role |
|--------|----------|-----------|------|
| POST | `/api/tokenization/tokenize` | Single tokenisasi FF1 | Admin, Operator |
| POST | `/api/tokenization/batch` | Batch tokenisasi (maks. 1.000) | Admin, Operator |
| POST | `/api/tokenization/detokenize` | Reveal nilai asli dari result_id | Admin, Operator |
| GET | `/api/tokenization/results` | List hasil tokenisasi (pagination) | All |
| GET | `/api/tokenization/stats` | Statistik tokenisasi | All |
| DELETE | `/api/tokenization/results/:id` | Hapus satu hasil tokenisasi | **Admin only** |
| DELETE | `/api/tokenization/results` | Hapus semua hasil tokenisasi | **Admin only** |

### Master Data

| Endpoint | Deskripsi |
|----------|-----------|
| `/api/pii-types` | CRUD PII Types |
| `/api/tokenization-methods` | Read methods (FF1 only) |
| `/api/tokenization-rules` | CRUD Rules |
| `/api/tweaks` | CRUD Tweaks |
| `/api/users` | CRUD Users |
| `/api/roles` | CRUD Roles |
| `/api/audit-logs` | Audit Log (read + archive) |
| `/api/settings` | System Settings |
| `/api/jobs` | Batch Jobs (read only) |

### Contoh Request — Single Tokenisasi

```json
POST /api/tokenization/tokenize
Authorization: Bearer <jwt_token>

{
  "pii_type_id": "uuid-nik",
  "method_id":   "uuid-ff1",
  "rule_id":     "uuid-rule-nik",
  "value":       "3276011203990001",
  "save_result": true
}
```

```json
Response 200:
{
  "status": "success",
  "data": {
    "tokenized_value":    "3271089452670034",
    "method_used":        "Full FPE FF1",
    "tweak_used":         "STATIC",
    "processing_time_ms": 8,
    "length_preserved":   true
  }
}
```

### Contoh Request — Detokenisasi

```json
POST /api/tokenization/detokenize
Authorization: Bearer <jwt_token>

{
  "result_id": "uuid-tokenization-result"
}
```

```json
Response 200:
{
  "status": "success",
  "data": {
    "result_id":       "uuid-tokenization-result",
    "tokenized_value": "3271089452670034",
    "original_value":  "3276011203990001",
    "pii_type":        "NIK",
    "rule_name":       "NIK - Full FPE FF1",
    "job_name":        "Single-1716000000000",
    "tokenized_at":    "2025-05-15T10:00:00.000Z"
  }
}
```

---

## Akun Default

Setelah menjalankan `node src/database/seed.js`:

| Full Name | Email | Password | Role |
|-----------|-------|----------|------|
| System Admin | `admin@system.id` | `Admin@12345` | Admin |
| Operator Pertama | `operator1@bank.id` | `Operator@12345` | Operator |
| Audit Officer | `auditor1@bank.id` | `Auditor@12345` | Auditor |
| Data Consumer 1 | `dataconsumer1@bank.id` | `Consumer@12345` | Data Consumer |

---

## Catatan Keamanan

1. **FPE Key** — Wajib ganti `FPE_KEY` di production dengan key 256-bit yang kuat; jangan gunakan default
2. **JWT Secret** — Ganti `JWT_SECRET` di `.env` dengan random string minimal 64 karakter
3. **Plaintext** — Sistem menyimpan `original_value` di tabel `pii_data` untuk keperluan detokenisasi; amankan akses DB
4. **HTTPS** — Selalu gunakan HTTPS di production; tambahkan SSL termination di reverse proxy
5. **Audit Trail** — Semua aktivitas (tokenisasi, detokenisasi, hapus, login) tercatat di `audit_logs`
6. **Delete Admin Only** — Penghapusan data tokenisasi dibatasi role Admin di level controller & UI
7. **FPE Production** — Untuk production, pertimbangkan library NIST-compliant seperti `node-ff1` atau `OpenFHE`

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3, Zustand, Lucide React |
| Backend | Node.js 20, Express.js 4, Prisma ORM 5, Zod |
| Database | PostgreSQL 16 |
| Auth | JWT (7 hari), bcrypt (12 rounds) |
| Security | Helmet, CORS, Rate Limiting, RBAC middleware |
| DevOps | Docker, Docker Compose, Nginx (frontend), Redis 7 |
| UML | Mermaid.js (5 diagram: Use Case, Class, Activity, Component, Deployment) |

---

*Dynamic PII Tokenization System — v2.0.0*
*Farid Tahmid Fauzi (20220801503) — Teknik Informatika, Universitas Esa Unggul*
