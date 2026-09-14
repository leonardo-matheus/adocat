ALTER TABLE pets MODIFY city VARCHAR(100) NOT NULL;
ALTER TABLE adoptions MODIFY city VARCHAR(100) NOT NULL, MODIFY status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE volunteers MODIFY city VARCHAR(100) NOT NULL, MODIFY status VARCHAR(20) NOT NULL DEFAULT 'pending';

UPDATE adoptions SET status = 'pending' WHERE status = 'new';
UPDATE adoptions SET status = 'contacted' WHERE status = 'reviewing';
UPDATE volunteers SET status = 'pending' WHERE status = 'new';
UPDATE volunteers SET status = 'contacted' WHERE status = 'inactive';
ALTER TABLE adoptions MODIFY status ENUM('pending','contacted','approved','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE volunteers MODIFY status ENUM('pending','contacted','active') NOT NULL DEFAULT 'pending';
