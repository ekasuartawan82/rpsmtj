-- ==============================================================================
-- Migration: Phase 3A Multi-Prodi Infrastructure
-- Target: WordPress + MySQL (Poltrada Bali)
-- ==============================================================================

-- 1. Create wp_prodi_user_profile table (application-layer relation, no hard FK)
CREATE TABLE IF NOT EXISTS `wp_prodi_user_profile` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `institution_code` VARCHAR(50) DEFAULT 'POLTRADA_BALI',
  `prodi_code` VARCHAR(10) NOT NULL,  -- MTJ, TO, MLOG
  `academic_role` VARCHAR(50),
  `smartcampus_id` VARCHAR(100),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `user_id` (`user_id`),
  KEY `prodi_code` (`prodi_code`),
  KEY `smartcampus_id` (`smartcampus_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Add prodi_code column to wp_prodi_kurikulum (if exists)
SET @exist_kurikulum = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_kurikulum'
);

SET @col_exist_kurikulum = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_kurikulum' AND column_name = 'prodi_code'
);

SET @sql_kurikulum = IF(
  @exist_kurikulum > 0 AND @col_exist_kurikulum = 0,
  'ALTER TABLE `wp_prodi_kurikulum` ADD COLUMN `prodi_code` VARCHAR(10) NULL, ADD INDEX `idx_kurikulum_prodi` (`prodi_code`);',
  'SELECT "wp_prodi_kurikulum.prodi_code already exists or table not present";'
);
PREPARE stmt_kurikulum FROM @sql_kurikulum;
EXECUTE stmt_kurikulum;
DEALLOCATE PREPARE stmt_kurikulum;

-- 3. Add prodi_code column to wp_prodi_rps (if exists)
SET @exist_rps = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_rps'
);

SET @col_exist_rps = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_rps' AND column_name = 'prodi_code'
);

SET @sql_rps = IF(
  @exist_rps > 0 AND @col_exist_rps = 0,
  'ALTER TABLE `wp_prodi_rps` ADD COLUMN `prodi_code` VARCHAR(10) NULL, ADD INDEX `idx_rps_prodi` (`prodi_code`);',
  'SELECT "wp_prodi_rps.prodi_code already exists";'
);
PREPARE stmt_rps FROM @sql_rps;
EXECUTE stmt_rps;
DEALLOCATE PREPARE stmt_rps;

-- 4. Initial Backfill: Ensure existing records have default prodi_code
UPDATE `wp_prodi_rps` SET `prodi_code` = 'MTJ' WHERE `prodi_code` IS NULL OR `prodi_code` = '';
UPDATE `wp_prodi_kurikulum` SET `prodi_code` = 'MTJ' WHERE `prodi_code` IS NULL OR `prodi_code` = '';
