# Changelog — prodi-poltrada-rps

## 0.2.0 — 2026-06-23

Bug fixes, schema completion, and four new feature areas ported from the
original Next.js RPS application. All changes stay inside the WordPress
plugin (`php-integration/wordpress-plugin/prodi-poltrada-rps/`).

### Schema & migration
- **Fixed (critical):** `prodi_rps` was missing `prodi_code`, `version_number`,
  `is_current`, `program_studi` — referenced by Phase-3 code but never created
  by `create_tables()`. Columns added to the DDL plus an idempotent
  `ensure_schema_columns()` backfill (runs on activation AND on `admin_init`
  via option flag) so re-activation on existing sites upgrades in place.
- Added `wp_prodi_smartcampus_sync` staging table (ETL CSV import).
- New `Prodi_RPS_Migration::migrate_to_usermeta()` — moves prodi code + role
  from the legacy `wp_prodi_user_profile` table into `wp_usermeta`
  (`rps_prodi_code`, `rps_role`); legacy table preserved as a renamed backup.

### Bug fixes (mechanical)
- Fixed `ajax_dashboard_list()` calling non-existent `get_rps_list()` → now
  calls `list_rps($actor, $filters)` with the correct argument order.
- Fixed `handle_ajax_governance_action()` reading `$actor['user_id']`
  (undefined) → `$actor['id']` (3 sites).
- `list_rps()` now SELECTs `version_number AS version_no` and `version_count`
  alias so the frontend list view no longer fatals.
- Removed all `error_log("ACCESS DEBUG ...")` calls from `get_rps_detail()`
  and `can_access_rps()`.
- Removed dead `Prodi_RPS_DB::update_rps_header()` (no callers; the
  lock-version-aware version in `Prodi_RPS_Governance_Service` is canonical).
- `create_rps()` now persists `prodi_code`, `program_studi`, `version_number`,
  `is_current`; `current_actor()` exposes `prodi_code`.

### Refactor: usermeta-based role/prodi (no extra table)
- `Prodi_Scope_Filter::get_user_prodi()` reads `rps_prodi_code` usermeta
  (was: `SELECT prodi_code FROM wp_prodi_user_profile`).
- `Prodi_Dashboard_Filter::get_actor()` resolves role via
  `Prodi_RPS_DB::canonical_role_for_user()` + prodi via usermeta; returns
  `prodi_code` alongside `id`/`role`.
- `Prodi_Smartcampus_Sync::import_csv()` writes `rps_prodi_code`/`rps_role`
  usermeta (was: upsert into `prodi_user_profile`); staging rows still written
  to `wp_prodi_smartcampus_sync`.

### Feature: freshness review guards (anti-rubber-stamping)
- New `Prodi_RPS_Governance_Service::assert_review_is_fresh()` — a reviewer
  cannot approve if `last_changed_at > last_reviewed_at_by_<reviewer>`;
  first review (NULL timestamp) always allowed.
- On reject, the *other* reviewer's timestamp resets to NULL (symmetric
  re-review). NULL values now emit literal `= NULL` (not `''`) in the UPDATE.
- `Prodi_RPS_DB::touch_last_changed()` bumps `last_changed_at` on every
  sub-entity mutator (CPL/CPMK/Sub-CPMK/Pertemuan/Pustaka).

### Feature: OBE pre-submit validation
- New `Prodi_RPS_Validator::collect_violations()` / `assert_ready_for_submission()`
  — 12 hard blockers (header completeness, ≥1 CPL/CPMK/Pertemuan, CPMK↔CPL
  mapping, Sub-CPMK per CPMK, korelasi CPL >0%, sub-CPMK referenced in
  pertemuan, **total bobot = 100%**, catatan-penugasan↔RTM match, RTM↔pertemuan
  link, UTS week 8 / UAS week 16). Hooked into `submit_to_rmk`.

### Feature: soft warnings (W-01..W-04) + acknowledge
- `compute_warnings()` (W-01 indikator ≥8 kata, W-02 kata kerja operasional
  KKO, W-03 rujukan pustaka fuzzy, W-04 bobot sub-CPMK >25%).
- `acknowledge_warning()` persists an `acknowledge_warning` approval-log row;
  `assert_active_warnings_acknowledged()` blocks submit until each is acked
  since the last document change.
- New AJAX endpoints: `prodi_rps_validate`, `prodi_rps_warnings`,
  `prodi_rps_acknowledge_warning`.

### Feature: PDF export (mPDF)
- New `Prodi_RPS_Pdf::export_pdf()` — gated to `approved` RPS; renders
  `includes/templates/rps-document.php` (header instansi, identitas, CPL,
  CPMK↔CPL matrix, korelasi matrix, tabel 16 minggu, pustaka, RTM).
- `composer.json` for mPDF 8; graceful fallback message when the library is
  absent. New AJAX endpoint `prodi_rps_export_pdf`.

### Testing
- Rewrote `test-concurrency.php` — 7 checks: submit happy path, authz matrix,
  optimistic-lock conflict, freshness guard (block + first-review allow),
  audit-log integrity. **7/7 passing** (CLI mock-wpdb, no WP/MySQL needed).
- New `test-validator.php` — 19 checks across 9 scenarios covering all 12
  OBE hard blockers and **all 4 soft warnings (W-01..W-04)** with positive
  + negative assertions. **19/19 passing** (CLI mock-wpdb).
- `sql/seed-kurikulum-sample.sql` (9 mata kuliah MTJ/TO/MLOG).
- `sql/seed-test-users.php` (wp_insert_user + usermeta; never touches real
  password hashes).
- `tests/manual-verification-checklist.md` — including a marked BLOCKER
  section for the mPDF end-to-end render (composer install + visual +
  special-character escaping probe) that could not be exercised in the dev
  environment (no mPDF/composer available) and must pass on staging before
  merge. The migration prodi_user_profile→usermeta and smartcampus CSV sync
  are likewise flagged as requiring behavioral verification on staging.

### Scope of this change
- **15 PHP files touched** (count derived from `git show --name-status
  e83e356 -- '*.php'`): **7 modified** — `prodi-poltrada-rps.php`,
  `includes/class-db.php`, `includes/class-governance.php`,
  `includes/class-frontend.php`, `includes/class-prodi-scope-filter.php`,
  `includes/class-dashboard-filter.php`, `includes/class-smartcampus-sync.php`;
  **8 new** — `includes/class-migration.php`,
  `includes/class-rps-validator.php`, `includes/class-rps-pdf.php`,
  `includes/templates/rps-document.php`, `sql/seed-test-users.php`,
  `test-concurrency.php`, `test-validator.php` (the last two are CLI test
  harnesses, counted as PHP). Plus non-PHP: `composer.json`, `CHANGELOG.md`,
  `README.md`, `sql/seed-kurikulum-sample.sql`,
  `tests/manual-verification-checklist.md`, and pre-existing bundled files
  under `assets/`, `docs/`, `tests/k6/`.

  > Note: an earlier draft of this section and the 0.2.0 commit message
  > mis-stated the count as "12 (7 modified + 5 new)" and the test count as
  > "19/9". Corrected here; the authoritative counts are git-derived above.
  > Process lesson recorded: derive file/test counts from git output, not
  > manual enumeration.

### Not in scope (unchanged)
- Standalone PHP auth adapter under `php-integration/config/`+`lib/`+`public/`
  remains blocked (pending the real existing `users` table artifacts).
- The sibling plugin `Prodi Poltrada` (Archive.zip) is read-only; not modified.
- The pre-existing modification to `src/services/rps-workflow/clone-for-revision.ts`
  in the repo root is NOT part of this change and is committed separately.

## 0.1.0 — initial

Rebuild of the Next.js/Prisma RPS app as a WordPress plugin: 15-table schema,
governance engine with optimistic locking, copy-as-draft, version history,
prodi dashboard filter, smartcampus CSV sync.
