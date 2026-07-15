# Diagram UML — Sistem Tokenisasi PII
## *Dynamic PII Tokenization System menggunakan FPE FF1 + Tweak*

> **Tugas Akhir** | Farid Tahmid Fauzi (20220801503)  
> Program Studi Teknik Informatika — Universitas Esa Unggul  
> Stack: PostgreSQL · Express.js · React.js · Node.js (PERN)

---

## Daftar Diagram

| No | Diagram | Tipe | Deskripsi Singkat |
|----|---------|------|-------------------|
| 1 | [Use Case Diagram](#1-use-case-diagram) | Fungsional | Interaksi 4 aktor dengan 13 use case sistem |
| 2 | [Class Diagram](#2-class-diagram) | Struktural Statis | 13 entity class + 3 service class dan relasinya |
| 3 | [Activity Diagram](#3-activity-diagram) | Dinamis / Alur | Alur tokenisasi single dengan 3 swim lane |
| 4 | [Component Diagram](#4-component-diagram) | Arsitektur Komponen | 5 layer komponen beserta interface dan port |
| 5 | [Deployment Diagram](#5-deployment-diagram) | Infrastruktur | Topologi Docker container dan jaringan |

---

## 1. Use Case Diagram

**Deskripsi:** Menggambarkan interaksi antara empat aktor pengguna dengan seluruh fungsionalitas sistem. Seluruh aktor wajib melewati proses *Login / Autentikasi* berbasis JWT sebelum dapat mengakses use case lainnya (relasi `«include»`). Algoritma tokenisasi yang digunakan secara eksklusif adalah **FPE FF1** (Format-Preserving Encryption).

### Aktor dan Hak Akses

| Aktor | Deskripsi | Hak Akses |
|-------|-----------|-----------|
| **Admin** | Administrator sistem | Akses penuh ke seluruh modul termasuk hapus data tokenisasi |
| **Operator** | Petugas operasional | Tokenisasi (single & batch), detokenisasi, lihat hasil & master data |
| **Auditor** | Petugas audit & kepatuhan | Read-only: hasil tokenisasi, audit log, pengaturan, pengguna, master data |
| **Data Consumer** | Pemantau data | Read-only: hasil tokenisasi & master data |

### Matriks Izin (RBAC)

| Use Case | Admin | Operator | Auditor | Data Consumer |
|----------|:-----:|:--------:|:-------:|:-------------:|
| Login / Autentikasi | ✅ | ✅ | ✅ | ✅ |
| Kelola PII Types | ✅ CRUD | 👁 Read | 👁 Read | 👁 Read |
| Lihat Metode Tokenisasi (FF1) | ✅ | ✅ | ✅ | ✅ |
| Kelola Tokenization Rules | ✅ CRUD | 👁 Read | 👁 Read | 👁 Read |
| Kelola Tweak | ✅ CRUD | 👁 Read | 👁 Read | 👁 Read |
| Demo Tokenisasi Single | ✅ | ✅ | ❌ | ❌ |
| Tokenisasi Batch | ✅ | ✅ | ❌ | ❌ |
| Lihat Hasil Tokenisasi | ✅ | ✅ | ✅ | ✅ |
| Detokenisasi | ✅ | ✅ | ❌ | ❌ |
| Hapus Data Tokenisasi | ✅ | ❌ | ❌ | ❌ |
| Lihat Audit Log | ✅ | ❌ | ✅ | ❌ |
| Kelola Pengaturan Sistem | ✅ R+W | ❌ | 👁 Read | ❌ |
| Kelola Pengguna & Hak Akses | ✅ CRUD | ❌ | 👁 Read | ❌ |

```mermaid
graph LR
    %% ── Actors ──────────────────────────────────────────
    Admin(["👤 Admin"])
    Operator(["👤 Operator"])
    Auditor(["👤 Auditor"])
    DC(["👤 Data Consumer"])

    %% ── System Boundary ─────────────────────────────────
    subgraph SYS["‹‹System›› PII Tokenization System  (PERN Stack)"]

        subgraph AUTH["🔐 Autentikasi"]
            UC0(["Login / Autentikasi\n(JWT)"])
        end

        subgraph MASTER["📋 Manajemen Data Master"]
            UC1(["Kelola PII Types"])
            UC2(["Lihat Metode\nTokenisasi FF1"])
            UC3(["Kelola Tokenization Rules"])
            UC4(["Kelola Tweak"])
        end

        subgraph OPS["⚙️ Operasional Tokenisasi"]
            UC5(["Demo Tokenisasi\nSingle (FPE FF1)"])
            UC6(["Tokenisasi Batch"])
            UC7(["Lihat Hasil\nTokenisasi"])
            UC8(["Detokenisasi"])
            UC9(["Hapus Data\nTokenisasi"])
        end

        subgraph MONITOR["📊 Monitoring & Audit"]
            UC10(["Lihat Audit Log"])
            UC11(["Kelola Pengaturan\nSistem"])
        end

        subgraph ADMIN_UC["🛠️ Administrasi Sistem"]
            UC12(["Kelola Pengguna\n& Hak Akses"])
        end

    end

    %% ── Admin Associations ──────────────────────────────
    Admin --> UC0
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12

    %% ── Operator Associations ───────────────────────────
    Operator --> UC0
    Operator --> UC1
    Operator --> UC2
    Operator --> UC3
    Operator --> UC4
    Operator --> UC5
    Operator --> UC6
    Operator --> UC7
    Operator --> UC8

    %% ── Auditor Associations ────────────────────────────
    Auditor --> UC0
    Auditor --> UC1
    Auditor --> UC2
    Auditor --> UC3
    Auditor --> UC4
    Auditor --> UC7
    Auditor --> UC10
    Auditor --> UC11
    Auditor --> UC12

    %% ── Data Consumer Associations ──────────────────────
    DC --> UC0
    DC --> UC1
    DC --> UC2
    DC --> UC3
    DC --> UC4
    DC --> UC7

    %% ── Include Relations ───────────────────────────────
    UC5 -. "«include»" .-> UC0
    UC6 -. "«include»" .-> UC0
    UC8 -. "«include»" .-> UC7
    UC9 -. "«include»" .-> UC7

    %% ── Styling ─────────────────────────────────────────
    style Admin    fill:#1F3864,color:#fff,stroke:#1F3864
    style Operator fill:#2E75B6,color:#fff,stroke:#2E75B6
    style Auditor  fill:#1D9E75,color:#fff,stroke:#1D9E75
    style DC       fill:#595959,color:#fff,stroke:#595959

    style AUTH     fill:#EBF3F9,stroke:#2E75B6
    style MASTER   fill:#FFF9EF,stroke:#BA7517
    style OPS      fill:#EEF7F3,stroke:#1D9E75
    style MONITOR  fill:#F5F0FF,stroke:#7B5EA7
    style ADMIN_UC fill:#FFF0F0,stroke:#A32D2D
```

> **Catatan:**
> - Relasi `«include»` *Detokenisasi* → *Lihat Hasil Tokenisasi* menunjukkan bahwa detokenisasi dilakukan terhadap record hasil yang sudah tersimpan di database.
> - Relasi `«include»` *Hapus Data Tokenisasi* → *Lihat Hasil Tokenisasi* menunjukkan bahwa penghapusan hanya bisa dilakukan dari halaman hasil tokenisasi (Admin only).
> - Operator dan Auditor memiliki akses **read-only** terhadap UC1–UC4 (Data Master); hak modifikasi hanya milik Admin.

---

## 2. Class Diagram

**Deskripsi:** Menggambarkan struktur statis sistem — kelas entitas database (dipetakan melalui Prisma ORM), kelas service layer, dan relasi antar kelas termasuk foreign key, dependency, dan inheritance.

```mermaid
classDiagram
    direction TB

    %% ── Manajemen Akses ──────────────────────────────────────────
    class User {
        +UUID id
        +UUID role_id FK
        +String full_name
        +String email
        +String password_hash
        +String status
        +DateTime last_login
        +DateTime created_at
        +login(email, password) JWT
        +getProfile(id) UserDTO
        +updateStatus(id, status) void
    }

    class Role {
        +UUID id
        +String role_name
        +String description
        +getPermissions() Permission[]
        +hasPermission(action, module) Boolean
        %% Values: Admin, Operator, Auditor, Data Consumer
    }

    class Permission {
        +UUID id
        +String permission_name
        +String module_name
        +checkAccess(userId) Boolean
    }

    class RolePermission {
        +UUID id
        +UUID role_id FK
        +UUID permission_id FK
    }

    %% ── Konfigurasi Tokenisasi ────────────────────────────────────
    class PIIType {
        +UUID id
        +String name
        +String category
        +String validation_regex
        +Int min_length
        +Int max_length
        +String example_value
        +Boolean is_active
        +validate(value) Boolean
        +getActive() PIIType[]
    }

    class TokenizationMethod {
        +UUID id
        +String method_name
        +String description
        +Boolean supports_prefix
        +Boolean supports_suffix
        +Boolean supports_tweak
        +Boolean is_deterministic
        +Boolean is_active
        %% Satu-satunya metode aktif: Full FPE FF1
        %% supports_prefix=true, supports_suffix=true, supports_tweak=true
        +getDescription() String
    }

    class Tweak {
        +UUID id
        +String tweak_name
        +TweakType tweak_type
        +String tweak_value
        +Int tweak_length
        +Boolean is_active
        %% TweakType: STATIC | DYNAMIC | RANDOMIZED | USER_BASED
        +generate(userId) Buffer
    }

    class TokenizationRule {
        +UUID id
        +String rule_name
        +UUID pii_type_id FK
        +UUID method_id FK
        +UUID tweak_id FK
        +Int preserve_prefix
        +Int preserve_suffix
        +Boolean maintain_length
        +Boolean maintain_charset
        +Boolean is_active
        +getConfig() RuleConfig
        +validate() Boolean
    }

    %% ── Operasional ──────────────────────────────────────────────
    class PIIData {
        +UUID id
        +UUID pii_type_id FK
        +String original_value
        +String data_hash
        +UUID created_by FK
        +DateTime created_at
        +hashValue() String
    }

    class TokenizationJob {
        +UUID id
        +String job_name
        +Int total_data
        +Int success_count
        +Int failed_count
        +JobStatus status
        +UUID created_by FK
        +DateTime started_at
        +DateTime completed_at
        +updateProgress(success, failed) void
        +markComplete() void
    }

    class TokenizationResult {
        +UUID id
        +UUID job_id FK
        +UUID pii_data_id FK
        +UUID rule_id FK
        +String tokenized_value
        +Int processing_time_ms
        +ResultStatus status
        +String error_message
        +DateTime created_at
        %% id dikembalikan sebagai result_id di semua response API
        +getToken() String
        +getOriginalValue() String
    }

    class AuditLog {
        +UUID id
        +UUID user_id FK
        +String module_name
        +String activity
        +String description
        +String ip_address
        +String user_agent
        +DateTime created_at
        +create() void
    }

    class SystemSetting {
        +UUID id
        +String setting_key
        +String setting_value
        +String description
        +UUID updated_by FK
        +DateTime updated_at
        +get(key) String
        +update(key, value) void
    }

    %% ── Service Layer ────────────────────────────────────────────
    class FPEService {
        -Buffer key
        -Map charsetMap
        %% Algoritma: Full FPE FF1 (AES-based Feistel 10-round)
        +tokenize(options) TokenResult
        +fpeEncrypt(plain, key, tweak, charset) String
        +generateTweak(tweakConfig) Buffer
        +detectCharset(input) String
    }

    class AuthController {
        -PrismaClient prisma
        -String jwtSecret
        +login(email, password) JWT
        +register(dto) UserDTO
        +getProfile(userId) Profile
        +verifyToken(token) Payload
    }

    class TokenizationController {
        -PrismaClient prisma
        -FPEService fpeService
        +tokenizeSingle(req) TokenResponse
        +tokenizeBatch(req) BatchResponse
        +detokenize(req) DetokenizeResponse
        +getResults(params) PagedResult
        +getStats() StatsDTO
        +deleteResult(id) void
        +clearResults() void
    }

    %% ── Relasi Entitas ──────────────────────────────────────────
    User "n" --> "1" Role : dimiliki oleh
    Role "n" --> "n" Permission : melalui RolePermission
    RolePermission --> Role
    RolePermission --> Permission

    TokenizationRule "n" --> "1" PIIType : menggunakan
    TokenizationRule "n" --> "1" TokenizationMethod : menggunakan
    TokenizationRule "n" --> "0..1" Tweak : menggunakan

    PIIData "n" --> "1" PIIType : bertipe
    PIIData "n" --> "1" User : dibuat oleh

    TokenizationResult "n" --> "0..1" TokenizationJob : bagian dari
    TokenizationResult "n" --> "1" PIIData : berasal dari
    TokenizationResult "n" --> "0..1" TokenizationRule : menggunakan

    AuditLog "n" --> "1" User : dicatat untuk
    SystemSetting "n" --> "1" User : diperbarui oleh

    %% ── Relasi Service ───────────────────────────────────────────
    TokenizationController ..> FPEService : «uses»
    TokenizationController ..> TokenizationResult : «creates / deletes»
    TokenizationController ..> AuditLog : «creates»
    AuthController ..> AuditLog : «creates»
    AuthController ..> User : «queries»
```

---

## 3. Activity Diagram

**Deskripsi:** Menggambarkan alur aktivitas sistem untuk skenario utama: proses tokenisasi data pribadi *single* dari antarmuka Demo POC menggunakan algoritma **FPE FF1**. Menggunakan tiga swim lane untuk memisahkan tanggung jawab antara Frontend, Backend API, dan FPE Engine/Database.

```mermaid
flowchart TD
    Start(["⬤ Mulai"])

    %% ── Swim Lane: User / Frontend ─────────────────────────────
    subgraph FRONTEND["🖥️  User / Frontend  (React + Axios)"]
        A["Pilih PII Type dari dropdown\n(NIK, Rekening, Kartu Kredit, dll.)"]
        B["Input nilai data yang akan\nditokenisasi"]
        C["Pilih Rule atau konfigurasi\npreserve prefix/suffix\n(algoritma: FPE FF1)"]
        D["Klik tombol 'Tokenisasi'\n(preview lokal)"]
        E["Klik tombol 'Simpan Hasil'\n→ kirim ke backend API"]
        R["Tampilkan token hasil,\nwaktu proses, dan metadata\ndi antarmuka pengguna"]
    end

    %% ── Swim Lane: Backend API ─────────────────────────────────
    subgraph BACKEND["⚙️  Backend API  (Express.js + Middleware)"]
        F["HTTP POST /api/tokenization/tokenize\n{ pii_type_id, method_id, rule_id, value,\n  save_result: true }\nHeader: Authorization: Bearer {JWT}"]
        G{"JWT Token\nValid?"}
        H["Return 401\nUnauthorized"]
        I{"Permission\n'execute:tokenization'\ncukup?"}
        J["Return 403\nForbidden"]
        K["Validasi body request\nmenggunakan Zod schema"]
        L["Query tokenization_rule\n+ method (FF1) + tweak dari DB\n(Prisma ORM)"]
        M{"Rule\nditemukan?"}
        N["Gunakan method_id\nlangsung (manual mode)"]
        Q["Return JSON response:\n✓ result_id (jika save_result: true)\n✓ tokenized_value\n✓ processing_time_ms\n✓ method_used: Full FPE FF1\n✓ length_preserved"]
    end

    %% ── Swim Lane: FPE Engine / Database ───────────────────────
    subgraph ENGINE["🔐  FPE Engine / Database  (Node.js + PostgreSQL)"]
        O1["generateTweak(tweakConfig)\nsesuai tipe: STATIC / DYNAMIC /\nRANDOMIZED / USER_BASED"]
        O2["fpeEncrypt(core, key, tweak, charset)\nFull FPE FF1 — 10 Round Feistel Network\n(AES-256 HMAC-SHA256 PRF)"]
        O3["Gabungkan:\nprefix + tokenized_core + suffix"]
        P1["Simpan ke tabel pii_data\n(original_value + SHA-256 data_hash)"]
        P2["Buat tokenization_job\n(Single-{timestamp})"]
        P3["Simpan ke tabel tokenization_results\n(tokenized_value + processing_time_ms)"]
        P4["Catat ke tabel audit_logs\n(user_id + activity + ip_address)\n⚠️ Append-only"]
    end

    End(["⬤ Selesai"])

    %% ── Flow ────────────────────────────────────────────────────
    Start --> A --> B --> C --> D --> E
    E --> F
    F --> G
    G -->|"❌ Tidak"| H
    G -->|"✅ Ya"| I
    I -->|"❌ Tidak"| J
    I -->|"✅ Ya"| K
    K --> L --> M
    M -->|"❌ Tidak (manual)"| N
    M -->|"✅ Ya (rule mode)"| O1
    N --> O1
    O1 --> O2 --> O3
    O3 --> P1 --> P2 --> P3 --> P4
    P4 --> Q --> R --> End

    %% ── Styling ─────────────────────────────────────────────────
    style Start fill:#1F3864,color:#fff,stroke:#1F3864
    style End   fill:#1F3864,color:#fff,stroke:#1F3864

    style H fill:#FCEBEB,stroke:#A32D2D,color:#A32D2D
    style J fill:#FCEBEB,stroke:#A32D2D,color:#A32D2D

    style G fill:#FFF3CD,stroke:#BA7517,color:#BA7517
    style I fill:#FFF3CD,stroke:#BA7517,color:#BA7517
    style M fill:#FFF3CD,stroke:#BA7517,color:#BA7517

    style O2 fill:#E1F5EE,stroke:#1D9E75,color:#0D6B4A
    style P4 fill:#FFF0F0,stroke:#A32D2D,color:#A32D2D

    style FRONTEND fill:#EBF3F9,stroke:#2E75B6
    style BACKEND  fill:#EEF7F3,stroke:#1D9E75
    style ENGINE   fill:#FFF9EF,stroke:#BA7517
```

### Keterangan Simbol

| Simbol | Makna |
|--------|-------|
| ⬤ Hitam | Titik mulai / titik akhir (Initial / Final Node) |
| Kotak | Activity Node (aksi yang dilakukan) |
| Berlian / `{ }` | Decision Node (percabangan kondisi) |
| `→` Panah solid | Control Flow |
| Lane berwarna | Swim Lane (tanggung jawab per komponen) |

---

## 4. Component Diagram

**Deskripsi:** Menggambarkan organisasi arsitektur sistem pada level komponen, termasuk antarmuka (*interface*) yang disediakan dan dibutuhkan oleh setiap komponen, serta port komunikasi antar layer dalam lingkungan Docker.

```mermaid
graph TB
    %% ── Docker Boundary ─────────────────────────────────────────
    subgraph DOCKER["🐳  Docker Environment  —  docker-compose.yml"]

        %% ── Client Layer ──────────────────────────────────────
        subgraph CLIENT["🖥️  Client Layer"]
            direction TB
            FE["**React Frontend**\n──────────────\n📦 Image: nginx:alpine\n🔌 Port: 3000 → 80\n──────────────\n[i/f] Axios HTTP Client\n[i/f] Zustand State Store\n[i/f] React Router v6\n[i/f] Tailwind CSS UI"]
        end

        %% ── API Gateway Layer ─────────────────────────────────
        subgraph API["⚙️  API Gateway Layer"]
            direction TB
            EXPRESS["**Express.js API**\n──────────────\n📦 Image: node:20-alpine\n🔌 Port: 5000\n──────────────\n[mw] helmet() — Security Headers\n[mw] cors() — CORS Policy\n[mw] rateLimit() — 100/15 min\n[mw] auth.middleware — JWT verify\n[mw] role.middleware — RBAC\n[mw] error.middleware — Handler"]
        end

        %% ── Service Layer ─────────────────────────────────────
        subgraph SERVICES["🔐  Service Layer"]
            direction LR
            FPE["**FPE Engine**\nfpe.service.js\n──────────────\n[+] Full FPE FF1 (satu-satunya algoritma)\n[+] 10-round Feistel Network\n[+] AES-256 HMAC-SHA256 PRF\n[+] Tweak Generator (4 tipe)\n[+] Charset Detector (numeric/alpha/mixed)"]
            AUTHSVC["**Auth Service**\nauth.controller.js\n──────────────\n[+] JWT sign/verify (7d expiry)\n[+] bcrypt hash (12 round)\n[+] Permission loader (RBAC)\n[+] Audit writer"]
            AUDITSVC["**Audit Service**\naudit-logs module\n──────────────\n[+] Append-only log writer\n[+] IP & User-Agent tracking\n[+] Module activity recorder"]
        end

        %% ── Data Layer ────────────────────────────────────────
        subgraph DATA["🗄️  Data & Persistence Layer"]
            direction LR
            PRISMA["**Prisma ORM**\nprisma/schema.prisma\n──────────────\n[+] Type-safe query builder\n[+] Auto migration\n[+] Connection pooling\n[+] Transaction support\n[+] 13 model definitions"]
            PG["**PostgreSQL 16**\n📦 Image: postgres:16-alpine\n🔌 Port: 5432\n──────────────\n[db] 13 tabel relasional\n[db] pgcrypto extension\n[db] UUID primary keys\n[db] Index: email, hash, job_id\n💾 Volume: postgres_data"]
            REDIS["**Redis 7** *(opsional)*\n📦 Image: redis:7-alpine\n🔌 Port: 6379\n──────────────\n[q] BullMQ job queue\n[q] Batch worker processor\n💾 Volume: redis_data"]
        end

    end

    %% ── Network ───────────────────────────────────────────────
    NET[/"🌐 Docker Bridge Network\npii_tokenization_network"/]

    %% ── Communication Arrows ──────────────────────────────────
    FE      -->|"HTTP/JSON\n:3000"| EXPRESS
    EXPRESS -->|"Function Call\nin-process"| FPE
    EXPRESS -->|"Function Call\nin-process"| AUTHSVC
    EXPRESS -->|"Function Call\nin-process"| AUDITSVC
    EXPRESS -->|"Prisma Client\ntype-safe query"| PRISMA
    PRISMA  -->|"TCP :5432\nSQL Query"| PG
    EXPRESS -.->|"BullMQ\nQueue :6379"| REDIS

    FE      --- NET
    EXPRESS --- NET
    PG      --- NET
    REDIS   -.- NET

    %% ── Styling ─────────────────────────────────────────────────
    style CLIENT   fill:#EBF3F9,stroke:#2E75B6,color:#1F3864
    style API      fill:#EEF7F3,stroke:#1D9E75,color:#0D4A30
    style SERVICES fill:#FFF9EF,stroke:#BA7517,color:#6B3D00
    style DATA     fill:#F5F0FF,stroke:#7B5EA7,color:#3D1080
    style DOCKER   fill:#F8F9FF,stroke:#1F3864,color:#1F3864
    style NET      fill:#E1F5EE,stroke:#1D9E75,color:#0D4A30
```

### Interface Summary

| Komponen | Provides Interface | Required Interface |
|----------|-------------------|-------------------|
| React Frontend | UI/UX (HTTP:3000) | REST API /api/* |
| Express.js API | REST API (:5000) | FPE Engine, Prisma, JWT lib |
| FPE Engine | tokenize() — FF1 only | crypto (Node.js built-in) |
| Prisma ORM | Type-safe DB client | PostgreSQL TCP:5432 |
| PostgreSQL | SQL/TCP:5432 | Disk storage (Docker volume) |
| Redis | Queue API:6379 | BullMQ workers |

### Endpoint API Utama

| Method | Endpoint | Permission | Deskripsi |
|--------|----------|-----------|-----------|
| POST | `/api/auth/login` | Public | Login, return JWT |
| GET | `/api/auth/profile` | Semua role | Cek profil & validasi token aktif |
| POST | `/api/auth/logout` | Semua role | Catat sesi keluar ke audit log |
| POST | `/api/tokenization/tokenize` | execute:tokenization | Tokenisasi single (FPE FF1), return `result_id` jika `save_result: true` |
| POST | `/api/tokenization/batch` | execute:tokenization | Tokenisasi batch, setiap item return `result_id` |
| POST | `/api/tokenization/detokenize` | execute:tokenization | Detokenisasi (ambil nilai asli via `result_id`) |
| GET | `/api/tokenization/results` | read:tokenization | Lihat hasil tokenisasi, tiap item memiliki `result_id` eksplisit |
| GET | `/api/tokenization/stats` | read:tokenization | Statistik ringkasan operasi tokenisasi |
| DELETE | `/api/tokenization/results/:id` | Admin only | Hapus satu hasil tokenisasi |
| DELETE | `/api/tokenization/results` | Admin only | Hapus semua hasil tokenisasi |
| GET | `/api/audit-logs` | read:audit_logs | Lihat audit log dengan filter modul & aktivitas |
| POST | `/api/audit-logs/write` | Semua role (login) | Tulis log aktivitas dari frontend |
| POST | `/api/audit-logs/archive` | Admin only | Arsipkan log > 30 hari ke file |
| GET | `/api/users` | read:users | Lihat daftar pengguna |

---

## 5. Deployment Diagram

**Deskripsi:** Menggambarkan arsitektur infrastruktur fisik dan virtual sistem yang di-deploy, termasuk node komputasi, artifact perangkat lunak, dan relasi ketergantungan antar node sesuai konfigurasi `docker-compose.yml`.

```mermaid
graph TB
    %% ── Client Device ────────────────────────────────────────
    subgraph CLIENT["📱  Client Device  «device»"]
        BROWSER["🌐 Web Browser\nChrome / Firefox / Edge"]
        SPA["**React SPA**\nURL: http://localhost:3000\nVite Build → dist/"]
        BROWSER --> SPA
    end

    %% ── Docker Host ──────────────────────────────────────────
    subgraph HOST["🖥️  Docker Host  «server»\nOS: Ubuntu 24 LTS  |  Docker Engine 24+"]

        %% Frontend container
        subgraph C_FE["📦  Container: pii_tokenization_frontend"]
            ART_FE["**Artifact: Nginx + React Build**\n─────────────────────\nBase Image: nginx:alpine\nPort: 3000 → 80\nVolume: ./frontend/nginx.conf\nConfig: SPA routing (try_files)\nBuild: multi-stage (Node → Nginx)"]
        end

        %% Backend container
        subgraph C_BE["📦  Container: pii_tokenization_backend"]
            ART_BE["**Artifact: Node.js + Express API**\n─────────────────────\nBase Image: node:20-alpine\nPort: 5000 → 5000\nENV: FPE_KEY, JWT_SECRET, DATABASE_URL\nAlgoritma: Full FPE FF1 (fpe.service.js)\nCmd: prisma migrate deploy\n     && node src/server.js"]
        end

        %% PostgreSQL container
        subgraph C_PG["📦  Container: pii_tokenization_db"]
            ART_PG["**Artifact: PostgreSQL 16**\n─────────────────────\nBase Image: postgres:16-alpine\nPort: 5432 → 5432\nENV: POSTGRES_DB=pii_tokenization\nVolume: postgres_data:/var/lib/postgresql/data\nInit: CREATE EXTENSION pgcrypto"]
        end

        %% Redis container
        subgraph C_REDIS["📦  Container: pii_tokenization_redis  *(opsional)*"]
            ART_REDIS["**Artifact: Redis 7**\n─────────────────────\nBase Image: redis:7-alpine\nPort: 6379 → 6379\nVolume: redis_data:/data\nHealthcheck: redis-cli ping"]
        end

        %% Docker Network
        subgraph NETWORK["🌐  Docker Bridge Network: pii_tokenization_network"]
            NET_DESC["Seluruh container terhubung\nmelalui internal DNS\n(service name = hostname)"]
        end

    end

    %% ── Cloud / Registry ─────────────────────────────────────
    subgraph CLOUD["☁️  Cloud / Container Registry  «external»"]
        REGISTRY["**Docker Hub / GitHub Registry**\n──────────────────────\nnginx:alpine\nnode:20-alpine\npostgres:16-alpine\nredis:7-alpine"]
        ENV_STORE["**Secret Management**\n──────────────────────\n.env file (gitignored)\nCI/CD: GitHub Secrets\nCloud: AWS Secrets Manager\n      / Azure Key Vault"]
    end

    %% ── Deployment Connections ────────────────────────────────
    SPA          -->|"HTTP GET :3000"| ART_FE
    ART_FE       -->|"Proxy /api/*\nHTTP :5000"| ART_BE
    ART_BE       -->|"Prisma ORM\nTCP :5432"| ART_PG
    ART_BE       -.->|"BullMQ Queue\nTCP :6379"| ART_REDIS

    C_FE         --- NETWORK
    C_BE         --- NETWORK
    C_PG         --- NETWORK
    C_REDIS      -.- NETWORK

    REGISTRY     -->|"docker pull\n(build time)"| HOST
    ENV_STORE    -->|"inject at\nruntime"| C_BE

    %% ── Styling ──────────────────────────────────────────────
    style CLIENT   fill:#EBF3F9,stroke:#2E75B6,color:#1F3864
    style HOST     fill:#F0F4FF,stroke:#1F3864,color:#1F3864
    style C_FE     fill:#EBF3F9,stroke:#2E75B6
    style C_BE     fill:#EEF7F3,stroke:#1D9E75
    style C_PG     fill:#F5F0FF,stroke:#7B5EA7
    style C_REDIS  fill:#FFF9EF,stroke:#BA7517
    style NETWORK  fill:#E8FFF5,stroke:#1D9E75,color:#0D4A30
    style CLOUD    fill:#F8F8F8,stroke:#595959
```

### Konfigurasi Port Mapping

| Container | Host Port | Container Port | Protokol | Keterangan |
|-----------|-----------|----------------|----------|------------|
| pii_frontend | 3000 | 80 | HTTP | Nginx melayani React SPA |
| pii_backend | 5000 | 5000 | HTTP | Express.js REST API |
| pii_postgres | 5432 | 5432 | TCP | PostgreSQL database |
| pii_redis | 6379 | 6379 | TCP | Redis queue (opsional) |

### Variabel Lingkungan Kritis

```env
# Backend (.env) — TIDAK boleh di-commit ke repository
DATABASE_URL="postgresql://postgres:password@postgres:5432/pii_tokenization"
JWT_SECRET="random-secret-min-32-chars-change-in-production"
FPE_KEY="0123456789ABCDEF0123456789ABCDEF"   # 32-byte hex AES-256 (kunci FF1)
JWT_EXPIRES_IN="7d"
NODE_ENV="production"
REDIS_URL="redis://redis:6379"
```

> ⚠️ **Catatan Keamanan:** Pada environment *production*, `FPE_KEY` dan `JWT_SECRET` sebaiknya dikelola melalui solusi secret management seperti AWS Secrets Manager, HashiCorp Vault, atau Azure Key Vault — bukan dari file `.env` yang tersimpan di server.

---

## Ringkasan Kelima Diagram UML

| No | Diagram | Tipe UML | Perspektif | Elemen Utama | Standar |
|----|---------|----------|------------|--------------|---------|
| 1 | Use Case | Behavioral | Fungsional | 4 aktor (Admin/Operator/Auditor/Data Consumer), 13 use case, relasi `«include»` | UML 2.5 |
| 2 | Class | Structural | Data & Code | 13 entity class + 3 service class, atribut, method, relasi FK | UML 2.5 |
| 3 | Activity | Behavioral | Alur Proses | 3 swim lane, FPE FF1 engine, 3 decision node, save_result flow | UML 2.5 |
| 4 | Component | Structural | Arsitektur | 5 layer, 8 komponen, interface & port, endpoint tabel | UML 2.5 |
| 5 | Deployment | Structural | Infrastruktur | 3 node, 6 artifact, Docker network, environment variables | UML 2.5 |

---

## Cara Render Diagram

File ini menggunakan **Mermaid.js** untuk rendering diagram. Mermaid didukung secara *native* di:

| Platform | Dukungan |
|----------|----------|
| **GitHub / GitLab** | ✅ Otomatis dirender di README dan file `.md` |
| **VS Code** | ✅ Extension: *Markdown Preview Mermaid Support* |
| **Obsidian** | ✅ Built-in support |
| **Notion** | ✅ Code block dengan bahasa `mermaid` |
| **Typora** | ✅ Built-in Mermaid support |
| **Mermaid Live Editor** | ✅ [live.mermaid.js.org](https://mermaid.live) |
| **Pandoc** | ✅ dengan flag `--lua-filter mermaid-filter` |

---

*Dokumen ini merupakan bagian dari Tugas Akhir:*  
**"Implementasi Tokenisasi Data Pribadi dengan Format-Preserving Encryption (FPE) Berbasis Algoritma FF1 pada Sistem Informasi Berbasis Web untuk Mendukung Kepatuhan UU PDP"**  
*Farid Tahmid Fauzi — Universitas Esa Unggul — 2026*
