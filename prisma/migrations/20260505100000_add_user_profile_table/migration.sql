-- Migration: Create wp_prodi_user_profile table
-- Slice 3: Structured user-prodi mapping (replaces wp_usermeta prodi_code)
-- Authoritative source for prodi_code lookup in Prodi_Scope_Filter

CREATE TABLE IF NOT EXISTS wp_prodi_user_profile (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL COMMENT 'WordPress wp_users.ID',
  institution_code VARCHAR(50)   DEFAULT 'POLTRADA_BALI',
  prodi_code      VARCHAR(10)   NOT NULL COMMENT 'MTJ / TO / MLOG',
  academic_role   VARCHAR(50)   COMMENT 'dosen / kaprodi / koordinator_rmk',
  smartcampus_id  VARCHAR(100)  COMMENT 'External Smartcampus identifier',
  is_active       BOOLEAN       DEFAULT TRUE,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- One profile per user (a user belongs to one prodi at a time)
  UNIQUE KEY uq_user_id (user_id),
  KEY idx_prodi_code (prodi_code),
  KEY idx_smartcampus_id (smartcampus_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed: Bootstrap test users for governance regression tests
-- user_id values correspond to wp_users.ID in Docker environment
-- user_id=1 = admin (administrator role, bypasses prodi filter — no row needed)
-- user_id=2 = dosen@mtj.local (prodi=MTJ, role=dosen)
-- user_id=3 = rmk@mtj.local   (prodi=MTJ, role=koordinator_rmk)
-- user_id=4 = kaprodi@mtj.local (prodi=MTJ, role=kaprodi)

INSERT INTO wp_prodi_user_profile (user_id, prodi_code, academic_role)
VALUES
  (2, 'MTJ', 'dosen'),
  (3, 'MTJ', 'koordinator_rmk'),
  (4, 'MTJ', 'kaprodi')
ON DUPLICATE KEY UPDATE
  prodi_code    = VALUES(prodi_code),
  academic_role = VALUES(academic_role),
  is_active     = TRUE;

-- Verify
SELECT user_id, prodi_code, academic_role, is_active
FROM wp_prodi_user_profile
ORDER BY user_id;
