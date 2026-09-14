PRAGMA foreign_keys = OFF;

BEGIN;

CREATE TABLE pets_new (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, species TEXT NOT NULL CHECK(species IN ('cat','dog')),
    sex TEXT NOT NULL CHECK(sex IN ('female','male')), age_group TEXT NOT NULL CHECK(age_group IN ('kitten','adult','senior')),
    age_label TEXT NOT NULL, size TEXT NOT NULL CHECK(size IN ('small','medium','large')),
    city TEXT NOT NULL, image TEXT NOT NULL, description TEXT NOT NULL,
    temperament TEXT NOT NULL, vaccinated INTEGER NOT NULL DEFAULT 0, neutered INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','treatment','adopted')),
    vaccine_date TEXT NULL, neuter_date TEXT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pets_new (
    id, name, species, sex, age_group, age_label, size, city, image, description,
    temperament, vaccinated, neutered, status, vaccine_date, neuter_date, created_at
)
SELECT
    id, name, species, sex, age_group, age_label, size, city, image, description,
    temperament, vaccinated, neutered, status, vaccine_date, neuter_date, created_at
FROM pets;

DROP TABLE pets;
ALTER TABLE pets_new RENAME TO pets;
CREATE INDEX IF NOT EXISTS idx_pets_filters ON pets(status, species, age_group, city);

COMMIT;

PRAGMA foreign_keys = ON;
