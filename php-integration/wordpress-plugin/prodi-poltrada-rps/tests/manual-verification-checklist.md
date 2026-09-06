# Manual Verification Checklist — prodi-poltrada-rps

Walk through each item on a staging WordPress instance after installing the
plugin and seeding users (see `sql/seed-test-users.php`) and mata kuliah
(`sql/seed-kurikulum-sample.sql`). Tick `[x]` once verified.

## Setup
- [ ] Plugin activates without PHP fatal (`/wp-admin/plugins.php`)
- [ ] `wp_prodi_rps` table has columns: `prodi_code`, `version_number`,
      `is_current`, `program_studi` (verify via `DESCRIBE wp_prodi_rps;`)
- [ ] `wp_prodi_smartcampus_sync` table exists
- [ ] Each test user has `rps_role` + `rps_prodi_code` usermeta set

## Migration prodi_user_profile → usermeta (verify behaviorally on staging)
- [ ] On a staging DB that STILL contains `wp_prodi_user_profile` with real
      rows, run activation (or hit `wp-admin/` to trigger the `admin_init`
      backfill). Confirm option `prodi_rps_migration_usermeta_done` is set.
- [ ] Confirm each migrated user now has `rps_role` and `rps_prodi_code`
      usermeta matching their old `academic_role` / `prodi_code`.
- [ ] Confirm the legacy table was renamed to
      `wp_prodi_user_profile_old_<timestamp>` (NOT dropped).
- [ ] Idempotency: hit `wp-admin/` a second time — no second rename occurs,
      no duplicate usermeta writes.
- [ ] Confirm no other plugin owns a `wp_prodi_user_profile` table name that
      the rename could collide with.

## Smartcampus CSV sync (verify behaviorally on staging)
- [ ] Import a representative CSV (≥5 rows, mixed prodi). Confirm staging
      rows land in `wp_prodi_smartcampus_sync` with `raw_data` populated.
- [ ] For rows whose email matches an existing WP user, confirm
      `rps_prodi_code` usermeta is set and `rps_role` defaults to `dosen`
      only when no prior role exists.
- [ ] Re-import the same CSV — confirm `ON DUPLICATE KEY UPDATE` path
      (upsert by nidn) does not duplicate staging rows or clobber an
      admin-assigned reviewer role.

## Authentication & scoping
- [ ] Logged-out visitor to the `[prodi_rps_app]` page sees "Login WordPress"
- [ ] Dosen MTJ sees only their own RPS in the dashboard
- [ ] Dosen TO cannot open an MTJ RPS detail URL (403 / "akses ditolak")
- [ ] Admin sees all prodi and a prodi filter dropdown

## RPS authoring
- [ ] Dosen can create a new RPS (header: mata kuliah, tahun, deskripsi, bahan)
- [ ] Header edit bumps `last_changed_at` (verify in DB)
- [ ] Adding a CPMK / Sub-CPMK / Pertemuan bumps `last_changed_at`
- [ ] `version_number` starts at 1; `prodi_code` set from actor usermeta

## OBE validation (submit gate)
- [ ] Submitting an incomplete RPS (no CPL/CPMK) is blocked with a list of
      violations (AJAX `prodi_rps_validate`)
- [ ] Submitting with bobot sum ≠ 100% is blocked (`bobot_sum` rule)
- [ ] Submitting a fully compliant RPS succeeds → status `submitted_to_rmk`
- [ ] Soft warnings panel shows W-01..W-04 when applicable; acknowledging
      each persists an `acknowledge_warning` approval-log row
- [ ] Submit is blocked while any warning is unacknowledged

## Workflow + freshness
- [ ] RMK approves → status `submitted_to_kaprodi`; lock_version increments
- [ ] Kaprodi approves → status `approved`
- [ ] After approval, editing the header then a reviewer re-approve is
      **blocked** by the freshness guard (anti-rubber-stamp)
- [ ] RMK reject resets Kaprodi's review timestamp (NULL) → both re-review
- [ ] Audit log (`wp_prodi_rps_approval_log`) has one row per transition

## Concurrency
- [ ] Two simultaneous RMK approvals (same lock_version): first wins, second
      returns a concurrency error (k6 script: `tests/k6/submit-concurrency.js`)

## Version history & copy
- [ ] Version-history AJAX returns the lineage chain for a mata kuliah
- [ ] Copy-as-draft creates a new v+1 with `parent_rps_id` set and runtime
      fields (status_pelaksanaan, materi_aktual) reset to null

## PDF export (BLOCKER — must be verified e2e on staging before merge)
The mPDF render path has never been exercised in the dev environment (no
composer/mPDF here). Static lint of the template passed, but document output
MUST be checked manually before sign-off.
- [ ] `composer install --no-dev --optimize-autoloader` succeeds inside the
      plugin folder; `\Mpdf\Mpdf` is autoloadable.
- [ ] Create one RPS, drive it through to `approved`, then click "Export PDF".
- [ ] Download produces `RPS_<kode>_<tahun>_v<n>.pdf` (correct filename,
      non-zero size, opens without error).
- [ ] Visual checks on the rendered PDF:
      - [ ] Header: instansi name + logo render (logo path resolves).
      - [ ] Identity table: mata kuliah, SKS, dosen, status "APPROVED".
      - [ ] CPL / CPMK tables populate; CPMK↔CPL + korelasi matrix cells fill.
      - [ ] 16-week pertemuan table: weeks, tipe, sub-CPMK, indikator, bobot.
      - [ ] Pustaka + RTM sections render.
- [ ] **Special-character escaping probe:** set an RPS field (deskripsi,
      materi, pustaka teks_lengkap) to text containing `<`, `>`, `&`, `"`,
      `'`, and a CPMK code like `<script>`. Re-export and confirm:
      - the literal characters render correctly (HTML-decoded in the PDF),
      - no raw markup leaks, no double-escaping (`&amp;lt;`).
- [ ] Confirm "Export PDF" button is HIDDEN on non-approved RPS.

## Smartcampus CSV sync (behavioral — see Migration section above)
