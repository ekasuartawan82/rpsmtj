-- ==============================================================================
-- Seed: User Roles & Prodi Codes in wp_usermeta (Option B Architecture)
-- Target: WordPress + MySQL (Poltrada Bali)
-- Matches: Dosen MTJ (ID 2), RMK MTJ (ID 3), Kaprodi MTJ (ID 4), Dosen TO (ID 5)
-- ==============================================================================

-- 1. Dosen MTJ
INSERT INTO `wp_usermeta` (`user_id`, `meta_key`, `meta_value`)
VALUES 
  (2, 'rps_role', 'dosen'),
  (2, 'rps_prodi_code', 'MTJ')
ON DUPLICATE KEY UPDATE `meta_value` = VALUES(`meta_value`);

-- 2. Koordinator RMK MTJ
INSERT INTO `wp_usermeta` (`user_id`, `meta_key`, `meta_value`)
VALUES 
  (3, 'rps_role', 'koordinator_rmk'),
  (3, 'rps_prodi_code', 'MTJ')
ON DUPLICATE KEY UPDATE `meta_value` = VALUES(`meta_value`);

-- 3. Kaprodi MTJ
INSERT INTO `wp_usermeta` (`user_id`, `meta_key`, `meta_value`)
VALUES 
  (4, 'rps_role', 'kaprodi'),
  (4, 'rps_prodi_code', 'MTJ')
ON DUPLICATE KEY UPDATE `meta_value` = VALUES(`meta_value`);

-- 4. Dosen TO (Cross-prodi test actor)
INSERT INTO `wp_usermeta` (`user_id`, `meta_key`, `meta_value`)
VALUES 
  (5, 'rps_role', 'dosen'),
  (5, 'rps_prodi_code', 'TO')
ON DUPLICATE KEY UPDATE `meta_value` = VALUES(`meta_value`);
