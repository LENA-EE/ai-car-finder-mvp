-- AI Car Finder MVP - Database Schema
-- Согласно architecture.txt section 6 (Domain Model)

-- ===========================================
-- 1. CARS CATALOG (50K records capacity)
-- ===========================================
CREATE TABLE IF NOT EXISTS cars_catalog (
    id SERIAL PRIMARY KEY,
    mark_name VARCHAR(100) NOT NULL,
    mark_code VARCHAR(50),
    folder_name VARCHAR(100),
    folder_id VARCHAR(50),
    model_name VARCHAR(100),
    modification_name VARCHAR(200),
    modification_id VARCHAR(50),
    tech_param_id VARCHAR(50),
    configuration_id VARCHAR(50),
    body_type VARCHAR(100),
    engine_volume DECIMAL(3,1),
    hp INTEGER,
    transmission VARCHAR(20),
    drive_type VARCHAR(20),
    engine_type VARCHAR(30),
    year INTEGER,
    year_from INTEGER,
    year_to INTEGER,
    price INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности (80% запросов)
CREATE INDEX IF NOT EXISTS idx_cars_mark_name ON cars_catalog(mark_name);
CREATE INDEX IF NOT EXISTS idx_cars_folder_name ON cars_catalog(folder_name);
CREATE INDEX IF NOT EXISTS idx_cars_mark_folder ON cars_catalog(mark_name, folder_name);
CREATE INDEX IF NOT EXISTS idx_cars_engine ON cars_catalog(engine_volume, hp);
CREATE INDEX IF NOT EXISTS idx_cars_year_price ON cars_catalog(year, price);
CREATE INDEX IF NOT EXISTS idx_cars_body_type ON cars_catalog(body_type);
CREATE INDEX IF NOT EXISTS idx_cars_engine_type ON cars_catalog(engine_type);

-- ===========================================
-- 2. PARSE SESSIONS (Logging)
-- ===========================================
CREATE TABLE IF NOT EXISTS parse_sessions (
    id SERIAL PRIMARY KEY,
    user_query TEXT NOT NULL,
    filters JSONB,
    parsing_method VARCHAR(20) NOT NULL, -- 'llm', 'keyword', 'template'
    latency_ms FLOAT NOT NULL,
    cost_usd FLOAT NOT NULL,
    catalog_status VARCHAR(20) NOT NULL, -- 'empty', 'loaded', 'loading', 'error'
    results_count INTEGER DEFAULT 0,
    user_ip VARCHAR(45), -- Anonymized
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parse_created_at ON parse_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_parse_method ON parse_sessions(parsing_method);

-- ===========================================
-- 3. ADMIN USERS
-- ===========================================
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'admin', 'viewer'
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Default admin user (password: admin123 - change in production!)
-- bcrypt hash for 'admin123'
INSERT INTO admin_users (email, password_hash, role)
VALUES ('admin@ai-car-finder.app', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q7dHPHnJJ1xYBi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ===========================================
-- 4. ADMIN AUDIT LOG (100% coverage)
-- ===========================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    admin_email VARCHAR(255),
    action_type VARCHAR(50) NOT NULL, -- 'upload_catalog', 'edit_prompt', 'login', etc.
    payload JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON admin_audit_log(action_type);

-- ===========================================
-- 5. PROMPT VERSIONS (Hot reload history)
-- ===========================================
CREATE TABLE IF NOT EXISTS prompt_versions (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    system_prompt TEXT NOT NULL,
    temperature FLOAT DEFAULT 0.1,
    max_tokens INTEGER DEFAULT 200,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived'
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default prompt
INSERT INTO prompt_versions (version, system_prompt, temperature, max_tokens, status)
VALUES (1, 'Ты парсер запросов для каталога Auto.ru. Преобразуй текст в JSON фильтры.', 0.1, 200, 'active')
ON CONFLICT DO NOTHING;

-- ===========================================
-- 6. ERROR GRAVEYARD (Top parsing errors)
-- ===========================================
CREATE TABLE IF NOT EXISTS error_graveyard (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(50) NOT NULL, -- 'unknown_brand', 'ambiguous_query', etc.
    query_pattern TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_seen TIMESTAMP DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolution_note TEXT,
    UNIQUE(error_type, query_pattern)
);

CREATE INDEX IF NOT EXISTS idx_error_frequency ON error_graveyard(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_error_type ON error_graveyard(error_type);

-- ===========================================
-- 7. DAILY METRICS (Materialized view for dashboard)
-- ===========================================
CREATE TABLE IF NOT EXISTS daily_metrics (
    date DATE PRIMARY KEY,
    total_requests INTEGER DEFAULT 0,
    successful_parses INTEGER DEFAULT 0,
    parsing_accuracy FLOAT DEFAULT 0,
    llm_cost_usd FLOAT DEFAULT 0,
    catalog_size INTEGER DEFAULT 0,
    top_brands JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 8. SYNONYMS (Brand slang mapping)
-- ===========================================
CREATE TABLE IF NOT EXISTS synonyms (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- 'brands', 'body_types', 'engine_types', etc.
    slang VARCHAR(100) NOT NULL,
    normalized VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category, slang)
);

-- Default brand synonyms
INSERT INTO synonyms (category, slang, normalized) VALUES
    ('brands', 'бумер', 'BMW'),
    ('brands', 'бмв', 'BMW'),
    ('brands', 'тойота', 'Toyota'),
    ('brands', 'мерс', 'Mercedes-Benz'),
    ('brands', 'мерседес', 'Mercedes-Benz'),
    ('brands', 'ауди', 'Audi'),
    ('brands', 'лексус', 'Lexus')
ON CONFLICT (category, slang) DO NOTHING;

-- ===========================================
-- 9. SAMPLE DATA (3 cars for MVP testing)
-- ===========================================
INSERT INTO cars_catalog (mark_name, folder_name, body_type, engine_volume, hp, transmission, drive_type, engine_type, year, price)
VALUES
    ('BMW', 'X5', 'Внедорожник 5 дв.', 3.0, 249, 'AT', '4WD', 'diesel', 2019, 4200000),
    ('BMW', 'X5', 'Внедорожник 5 дв.', 3.0, 340, 'AT', '4WD', 'gasoline', 2020, 4800000),
    ('Toyota', 'RAV4', 'Внедорожник 5 дв.', 2.0, 150, 'CVT', 'FWD', 'gasoline', 2021, 2500000)
ON CONFLICT DO NOTHING;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
