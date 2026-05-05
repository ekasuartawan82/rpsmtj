-- Migration: Create wp_prodi_smartcampus_sync table
-- Slice 4: Smartcampus integration — sync table for external dosen data
-- MVP: file import (CSV). api sync = future slice.

CREATE TABLE IF NOT EXISTS wp_prodi_smartcampus_sync (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nidn            VARCHAR(20)  NOT NULL UNIQUE COMMENT 'Nomor Induk Dosen Nasional',
  nama_lengkap    VARCHAR(200) NOT NULL,
  email           VARCHAR(200),
  prodi_code      VARCHAR(10)  NOT NULL COMMENT 'MTJ / TO / MLOG',
  status_aktif    TINYINT(1)   DEFAULT 1,
  wp_user_id      BIGINT UNSIGNED NULL COMMENT 'NULL jika belum ada akun WordPress',
  sync_source     ENUM('manual', 'api') DEFAULT 'manual',
  last_synced     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  raw_data        JSON COMMENT 'Raw payload dari Smartcampus — preserved untuk audit',

  KEY idx_prodi (prodi_code),
  KEY idx_nidn (nidn),
  KEY idx_wp_user_id (wp_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed: Bootstrap sync records for MTJ test users
-- Mirrors wp_prodi_user_profile seed (user_id 2/3/4 = dosen/rmk/kaprodi)
INSERT INTO wp_prodi_smartcampus_sync
  (nidn, nama_lengkap, email, prodi_code, wp_user_id, sync_source)
VALUES
  ('900000003', 'Dosen MTJ',          'dosen@mtj.local',   'MTJ', 2, 'manual'),
  ('900000002', 'Koordinator RMK MTJ','rmk@mtj.local',     'MTJ', 3, 'manual'),
  ('900000001', 'Kaprodi MTJ',        'kaprodi@mtj.local', 'MTJ', 4, 'manual')
ON DUPLICATE KEY UPDATE
  nama_lengkap = VALUES(nama_lengkap),
  email        = VALUES(email),
  prodi_code   = VALUES(prodi_code),
  wp_user_id   = VALUES(wp_user_id),
  last_synced  = CURRENT_TIMESTAMP;

-- Verify
SELECT nidn, nama_lengkap, prodi_code, wp_user_id, sync_source
FROM wp_prodi_smartcampus_sync
ORDER BY nidn;
