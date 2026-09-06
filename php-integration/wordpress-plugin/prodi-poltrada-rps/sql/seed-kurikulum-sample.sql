-- Sample mata kuliah for local development.
-- The prodi-poltrada-rps plugin reads {prefix}prodi_kurikulum from the sibling
-- "Prodi Poltrada" plugin. If that plugin is not installed on your dev site,
-- import this file so the RPS module has courses to work with.
--
-- Table columns (per Archive.zip prodi-kurikulum schema):
--   nama_mk, kode_mk, sks_teori, sks_praktik, program_studi
--
-- Replace `wp_` with your actual table prefix if different.

INSERT INTO `wp_prodi_kurikulum` (`nama_mk`, `kode_mk`, `sks_teori`, `sks_praktik`, `program_studi`) VALUES
-- Manajemen Transportasi Jalan (MTJ)
('Manajemen Transportasi',              'MTJ101', 3, 0, 'MTJ'),
('Ekonomi Transportasi',                'MTJ102', 3, 0, 'MTJ'),
('Manajemen Terminal',                  'MTJ201', 2, 1, 'MTJ'),
-- Teknik Otomotif (TO)
('Motor Otomotif',                      'TO101',  2, 2, 'TO'),
('Sistem Pendingin Kendaraan',          'TO102',  2, 1, 'TO'),
('Diagnosis Kerusakan Mesin',           'TO201',  2, 2, 'TO'),
-- Manajemen Logistik (MLOG)
('Pengantar Logistik',                  'MLOG101', 3, 0, 'MLOG'),
('Manajemen Gudang',                    'MLOG102', 2, 1, 'MLOG'),
('Rantai Pasok',                        'MLOG201', 3, 0, 'MLOG')
ON DUPLICATE KEY UPDATE `nama_mk` = VALUES(`nama_mk`);
