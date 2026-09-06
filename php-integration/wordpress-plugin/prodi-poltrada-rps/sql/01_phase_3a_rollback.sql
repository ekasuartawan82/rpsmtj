-- ==============================================================================
-- Rollback: Phase 3A Multi-Prodi Infrastructure (Option B)
-- Target: WordPress + MySQL (Poltrada Bali)
-- ==============================================================================

-- 1. Drop indexes if they exist
SET @exist_idx_rps = (
  SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_rps' AND index_name = 'idx_rps_prodi'
);
SET @sql_drop_idx_rps = IF(@exist_idx_rps > 0, 'ALTER TABLE `wp_prodi_rps` DROP INDEX `idx_rps_prodi`;', 'SELECT 1;');
PREPARE stmt_drop_idx_rps FROM @sql_drop_idx_rps;
EXECUTE stmt_drop_idx_rps;
DEALLOCATE PREPARE stmt_drop_idx_rps;

SET @exist_idx_kur = (
  SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_kurikulum' AND index_name = 'idx_kurikulum_prodi'
);
SET @sql_drop_idx_kur = IF(@exist_idx_kur > 0, 'ALTER TABLE `wp_prodi_kurikulum` DROP INDEX `idx_kurikulum_prodi`;', 'SELECT 1;');
PREPARE stmt_drop_idx_kur FROM @sql_drop_idx_kur;
EXECUTE stmt_drop_idx_kur;
DEALLOCATE PREPARE stmt_drop_idx_kur;

-- 2. Drop columns if they exist
SET @exist_col_rps = (
  SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_rps' AND column_name = 'prodi_code'
);
SET @sql_drop_col_rps = IF(@exist_col_rps > 0, 'ALTER TABLE `wp_prodi_rps` DROP COLUMN `prodi_code`;', 'SELECT 1;');
PREPARE stmt_drop_col_rps FROM @sql_drop_col_rps;
EXECUTE stmt_drop_col_rps;
DEALLOCATE PREPARE stmt_drop_col_rps;

SET @exist_col_kur = (
  SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_kurikulum' AND column_name = 'prodi_code'
);
SET @sql_drop_col_kur = IF(@exist_col_kur > 0, 'ALTER TABLE `wp_prodi_kurikulum` DROP COLUMN `prodi_code`;', 'SELECT 1;');
PREPARE stmt_drop_col_kur FROM @sql_drop_col_kur;
EXECUTE stmt_drop_col_kur;
DEALLOCATE PREPARE stmt_drop_col_kur;
