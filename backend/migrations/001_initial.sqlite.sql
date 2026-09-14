CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, species TEXT NOT NULL CHECK(species IN ('cat','dog')),
    sex TEXT NOT NULL CHECK(sex IN ('female','male')), age_group TEXT NOT NULL CHECK(age_group IN ('kitten','adult','senior')),
    age_label TEXT NOT NULL, size TEXT NOT NULL CHECK(size IN ('small','medium','large')),
    city TEXT NOT NULL CHECK(city IN ('Araraquara','Matão')), image TEXT NOT NULL, description TEXT NOT NULL,
    temperament TEXT NOT NULL, vaccinated INTEGER NOT NULL DEFAULT 0, neutered INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','treatment','adopted')),
    vaccine_date TEXT NULL, neuter_date TEXT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, image TEXT NOT NULL,
    target NUMERIC NOT NULL, raised NUMERIC NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK(status IN ('active','completed')),
    category TEXT NOT NULL, external_url TEXT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS adoptions (
    id TEXT PRIMARY KEY, pet_id TEXT NOT NULL REFERENCES pets(id), name TEXT NOT NULL, email TEXT NOT NULL,
    phone TEXT NOT NULL, city TEXT NOT NULL, home_type TEXT NOT NULL, screened INTEGER NOT NULL,
    other_pets TEXT NOT NULL, routine TEXT NOT NULL, consent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','contacted','approved','rejected')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS volunteers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, city TEXT NOT NULL,
    interests TEXT NOT NULL, availability TEXT NOT NULL, message TEXT NOT NULL, consent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','contacted','active')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pets_filters ON pets(status, species, age_group, city);
CREATE INDEX IF NOT EXISTS idx_adoptions_created ON adoptions(created_at);
CREATE INDEX IF NOT EXISTS idx_volunteers_created ON volunteers(created_at);
