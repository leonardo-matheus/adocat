CREATE TABLE IF NOT EXISTS pets (
    id CHAR(36) PRIMARY KEY, name VARCHAR(100) NOT NULL, species ENUM('cat','dog') NOT NULL,
    sex ENUM('female','male') NOT NULL, age_group ENUM('kitten','adult','senior') NOT NULL,
    age_label VARCHAR(50) NOT NULL, size ENUM('small','medium','large') NOT NULL,
    city ENUM('Araraquara','Matão') NOT NULL, image VARCHAR(2048) NOT NULL, description TEXT NOT NULL,
    temperament JSON NOT NULL, vaccinated BOOLEAN NOT NULL DEFAULT FALSE, neutered BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('available','treatment','adopted') NOT NULL DEFAULT 'available', vaccine_date DATE NULL,
    neuter_date DATE NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pets_filters (status, species, age_group, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS campaigns (
    id CHAR(36) PRIMARY KEY, title VARCHAR(150) NOT NULL, description TEXT NOT NULL, image VARCHAR(2048) NOT NULL,
    target DECIMAL(12,2) NOT NULL, raised DECIMAL(12,2) NOT NULL DEFAULT 0, status ENUM('active','completed') NOT NULL,
    category VARCHAR(80) NOT NULL, external_url VARCHAR(2048) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS adoptions (
    id CHAR(36) PRIMARY KEY, pet_id CHAR(36) NOT NULL, name VARCHAR(120) NOT NULL, email VARCHAR(254) NOT NULL,
    phone VARCHAR(30) NOT NULL, city ENUM('Araraquara','Matão') NOT NULL, home_type ENUM('house','apartment') NOT NULL,
    screened BOOLEAN NOT NULL, other_pets TEXT NOT NULL, routine TEXT NOT NULL, consent BOOLEAN NOT NULL,
    status ENUM('new','reviewing','approved','rejected') NOT NULL DEFAULT 'new', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_adoption_pet FOREIGN KEY (pet_id) REFERENCES pets(id), INDEX idx_adoptions_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS volunteers (
    id CHAR(36) PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(254) NOT NULL, phone VARCHAR(30) NOT NULL,
    city ENUM('Araraquara','Matão') NOT NULL, interests JSON NOT NULL, availability VARCHAR(255) NOT NULL,
    message TEXT NOT NULL, consent BOOLEAN NOT NULL, status ENUM('new','contacted','active','inactive') NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_volunteers_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
