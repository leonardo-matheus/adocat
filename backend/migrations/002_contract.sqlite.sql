ALTER TABLE adoptions RENAME TO adoptions_contract_old;
CREATE TABLE adoptions (
    id TEXT PRIMARY KEY, pet_id TEXT NOT NULL REFERENCES pets(id), name TEXT NOT NULL, email TEXT NOT NULL,
    phone TEXT NOT NULL, city TEXT NOT NULL, home_type TEXT NOT NULL, screened INTEGER NOT NULL,
    other_pets TEXT NOT NULL, routine TEXT NOT NULL, consent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','contacted','approved','rejected')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO adoptions SELECT id,pet_id,name,email,phone,city,home_type,screened,other_pets,routine,consent,
    CASE status WHEN 'new' THEN 'pending' WHEN 'reviewing' THEN 'contacted' ELSE status END,created_at FROM adoptions_contract_old;
DROP TABLE adoptions_contract_old;
CREATE INDEX IF NOT EXISTS idx_adoptions_created ON adoptions(created_at);

ALTER TABLE volunteers RENAME TO volunteers_contract_old;
CREATE TABLE volunteers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, city TEXT NOT NULL,
    interests TEXT NOT NULL, availability TEXT NOT NULL, message TEXT NOT NULL, consent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','contacted','active')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO volunteers SELECT id,name,email,phone,city,interests,availability,message,consent,
    CASE status WHEN 'new' THEN 'pending' WHEN 'inactive' THEN 'contacted' ELSE status END,created_at FROM volunteers_contract_old;
DROP TABLE volunteers_contract_old;
CREATE INDEX IF NOT EXISTS idx_volunteers_created ON volunteers(created_at);
