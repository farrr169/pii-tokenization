-- ============================================================
-- Dynamic PII Tokenization System - Database Schema
-- PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    full_name VARCHAR(150),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. PERMISSIONS
-- ============================================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(100) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. ROLE_PERMISSIONS
-- ============================================================
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- ============================================================
-- 5. PII_TYPES
-- ============================================================
CREATE TABLE pii_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    validation_regex TEXT,
    min_length INT,
    max_length INT,
    example_value VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. TOKENIZATION_METHODS
-- ============================================================
CREATE TABLE tokenization_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method_name VARCHAR(100) NOT NULL,
    description TEXT,
    supports_prefix BOOLEAN DEFAULT FALSE,
    supports_suffix BOOLEAN DEFAULT FALSE,
    supports_tweak BOOLEAN DEFAULT FALSE,
    is_deterministic BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 7. TWEAKS
-- ============================================================
CREATE TABLE tweaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tweak_name VARCHAR(100) NOT NULL,
    tweak_type VARCHAR(50) CHECK (tweak_type IN ('STATIC', 'DYNAMIC', 'RANDOMIZED', 'USER_BASED')),
    tweak_value TEXT,
    tweak_length INT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. TOKENIZATION_RULES (CORE TABLE)
-- ============================================================
CREATE TABLE tokenization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(150) NOT NULL,
    pii_type_id UUID REFERENCES pii_types(id) ON DELETE CASCADE,
    method_id UUID REFERENCES tokenization_methods(id) ON DELETE SET NULL,
    tweak_id UUID REFERENCES tweaks(id) ON DELETE SET NULL,
    preserve_prefix INT DEFAULT 0,
    preserve_suffix INT DEFAULT 0,
    preserve_domain BOOLEAN DEFAULT FALSE,
    maintain_length BOOLEAN DEFAULT TRUE,
    maintain_charset BOOLEAN DEFAULT TRUE,
    randomized BOOLEAN DEFAULT FALSE,
    configuration JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 9. PII_DATA
-- ============================================================
CREATE TABLE pii_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pii_type_id UUID REFERENCES pii_types(id) ON DELETE SET NULL,
    original_value TEXT NOT NULL,
    data_hash TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 10. TOKENIZATION_JOBS
-- ============================================================
CREATE TABLE tokenization_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(150) NOT NULL,
    total_data INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 11. TOKENIZATION_RESULTS
-- ============================================================
CREATE TABLE tokenization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES tokenization_jobs(id) ON DELETE CASCADE,
    pii_data_id UUID REFERENCES pii_data(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES tokenization_rules(id) ON DELETE SET NULL,
    tokenized_value TEXT,
    processing_time_ms INT,
    status VARCHAR(50) CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 12. AUDIT_LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    module_name VARCHAR(100),
    activity VARCHAR(100),
    description TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 13. SYSTEM_SETTINGS
-- ============================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_pii_data_type ON pii_data(pii_type_id);
CREATE INDEX idx_pii_data_hash ON pii_data(data_hash);
CREATE INDEX idx_tokenization_results_job ON tokenization_results(job_id);
CREATE INDEX idx_tokenization_results_rule ON tokenization_results(rule_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_tokenization_rules_pii ON tokenization_rules(pii_type_id);
CREATE INDEX idx_jobs_status ON tokenization_jobs(status);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Roles
INSERT INTO roles (role_name, description) VALUES
('Admin', 'Full system access'),
('Operator', 'Can perform tokenization operations'),
('Auditor', 'Read-only access to audit logs and results'),
('Viewer', 'Read-only access to dashboard');

-- Permissions
INSERT INTO permissions (permission_name, module_name) VALUES
('create', 'users'), ('read', 'users'), ('update', 'users'), ('delete', 'users'),
('create', 'roles'), ('read', 'roles'), ('update', 'roles'), ('delete', 'roles'),
('create', 'pii_types'), ('read', 'pii_types'), ('update', 'pii_types'), ('delete', 'pii_types'),
('create', 'tokenization_rules'), ('read', 'tokenization_rules'), ('update', 'tokenization_rules'), ('delete', 'tokenization_rules'),
('execute', 'tokenization'), ('read', 'tokenization'),
('read', 'audit_logs'),
('read', 'settings'), ('update', 'settings');

-- PII Types
INSERT INTO pii_types (name, category, validation_regex, min_length, max_length, example_value) VALUES
('NIK', 'Identitas', '^\d{16}$', 16, 16, '3276011203990001'),
('NPWP', 'Pajak', '^\d{15}$', 15, 15, '012345678901234'),
('Nomor Rekening', 'Finansial', '^\d{10,16}$', 10, 16, '1234567890'),
('Kartu Kredit', 'Finansial', '^\d{13,19}$', 13, 19, '4111111111111111'),
('Nomor Telepon', 'Kontak', '^(08|\+62)\d{8,11}$', 10, 15, '081234567890'),
('Email', 'Kontak', '^[^@]+@[^@]+\.[^@]+$', 5, 150, 'user@example.com'),
('Passport', 'Identitas', '^[A-Z]{1,2}\d{6,7}$', 7, 9, 'A1234567'),
('Nama Lengkap', 'Identitas', NULL, 2, 100, 'John Doe');

-- Tokenization Methods
INSERT INTO tokenization_methods (method_name, description, supports_prefix, supports_suffix, supports_tweak, is_deterministic) VALUES
('Full FPE FF1', 'Format-Preserving Encryption menggunakan FF1 algorithm', FALSE, FALSE, TRUE, TRUE),
('Full FPE FF3', 'Format-Preserving Encryption menggunakan FF3-1 algorithm', FALSE, FALSE, TRUE, TRUE),
('Partial FPE', 'FPE dengan preserve prefix/suffix tertentu', TRUE, TRUE, TRUE, TRUE),
('Masking', 'Mengganti karakter dengan mask (misal: *)', TRUE, TRUE, FALSE, FALSE),
('Hashing SHA-256', 'One-way hash menggunakan SHA-256', FALSE, FALSE, FALSE, TRUE),
('Deterministic Token', 'Token deterministik berbasis lookup table', FALSE, FALSE, FALSE, TRUE),
('Random Token', 'Token acak non-deterministik', FALSE, FALSE, FALSE, FALSE);

-- Tweaks
INSERT INTO tweaks (tweak_name, tweak_type, tweak_value, tweak_length, description) VALUES
('Static Tweak Default', 'STATIC', 'TOKENSYSTEM2024', 15, 'Tweak statis default untuk semua tokenisasi'),
('Dynamic Timestamp', 'DYNAMIC', NULL, 8, 'Tweak berdasarkan timestamp saat eksekusi'),
('Randomized 8-byte', 'RANDOMIZED', NULL, 8, 'Tweak acak 8 byte untuk setiap tokenisasi'),
('User-Based Tweak', 'USER_BASED', NULL, 16, 'Tweak berbasis user ID untuk isolasi per user');

-- System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('fpe_key', 'AES256DEFAULTKEY1234567890ABCDEF', 'AES Key untuk FPE encryption (ganti di production)'),
('max_batch_size', '1000', 'Maksimum record per batch job'),
('token_expiry_days', '365', 'Masa berlaku token dalam hari'),
('audit_retention_days', '730', 'Retensi audit log dalam hari'),
('app_version', '1.0.0', 'Versi aplikasi saat ini');
