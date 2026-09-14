CREATE TABLE IF NOT EXISTS site_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    draft_json TEXT NOT NULL,
    published_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NULL,
    published_at TEXT NULL
);

INSERT OR IGNORE INTO site_content (id, draft_json, published_json, revision)
VALUES (1, '{"values":{},"articles":null,"navigation":null,"integrations":{"whatsapp":"5516997587596","email":"adocat.adocao@gmail.com","instagram":"","facebook":"","pixKey":"","donationRecipient":"","donationCity":""}}', '{"values":{},"articles":null,"navigation":null,"integrations":{"whatsapp":"5516997587596","email":"adocat.adocao@gmail.com","instagram":"","facebook":"","pixKey":"","donationRecipient":"","donationCity":""}}', 1);

CREATE TABLE IF NOT EXISTS media_library (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    alt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_created ON media_library(created_at);
