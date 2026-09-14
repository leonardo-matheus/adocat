CREATE TABLE IF NOT EXISTS site_content (
    id TINYINT UNSIGNED PRIMARY KEY,
    draft_json LONGTEXT NOT NULL,
    published_json LONGTEXT NOT NULL,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at DATETIME NULL DEFAULT NULL,
    published_at DATETIME NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO site_content (id, draft_json, published_json, revision)
VALUES (1, '{"values":{},"articles":null,"navigation":null,"integrations":{"whatsapp":"5516997587596","email":"adocat.adocao@gmail.com","instagram":"","facebook":"","pixKey":"","donationRecipient":"","donationCity":""}}', '{"values":{},"articles":null,"navigation":null,"integrations":{"whatsapp":"5516997587596","email":"adocat.adocao@gmail.com","instagram":"","facebook":"","pixKey":"","donationRecipient":"","donationCity":""}}', 1);

CREATE TABLE IF NOT EXISTS media_library (
    id CHAR(36) PRIMARY KEY,
    url VARCHAR(2048) NOT NULL,
    name VARCHAR(200) NOT NULL,
    alt VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_media_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
