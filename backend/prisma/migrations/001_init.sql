-- Migration: Initial Schema
-- Dynamic PII Tokenization System

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    full_name VARCHAR(150),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(100) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

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

CREATE TABLE tweaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tweak_name VARCHAR(100) NOT NULL,
    tweak_type VARCHAR(50),
    tweak_value TEXT,
    tweak_length INT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tokenization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(150) NOT NULL,
    pii_type_id UUID REFERENCES pii_types(id) ON DELETE CASCADE,
    method_id UUID REFERENCES tokenization_methods(id),
    tweak_id UUID REFERENCES tweaks(id),
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

CREATE TABLE pii_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pii_type_id UUID REFERENCES pii_types(id),
    original_value TEXT NOT NULL,
    data_hash TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tokenization_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(150) NOT NULL,
    total_data INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tokenization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES tokenization_jobs(id) ON DELETE CASCADE,
    pii_data_id UUID REFERENCES pii_data(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES tokenization_rules(id),
    tokenized_value TEXT,
    processing_time_ms INT,
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    module_name VARCHAR(100),
    activity VARCHAR(100),
    description TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_pii_data_type ON pii_data(pii_type_id);
CREATE INDEX idx_pii_data_hash ON pii_data(data_hash);
CREATE INDEX idx_tokenization_results_job ON tokenization_results(job_id);
CREATE INDEX idx_tokenization_results_rule ON tokenization_results(rule_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_jobs_status ON tokenization_jobs(status);
