# QC Response — Submission Guard And PRD Alignment

**Date:** 2026-04-18
**Scope:** `src/services/rps-workflow/submit.ts`

## Summary

The submission guard has been corrected to match the hard blockers listed in PRD section 4.1. The earlier document overstated PRD coverage and used inaccurate section labels; that has been removed here.

## Implemented Hard Blockers

The backend now rejects submit when any of these conditions is true:

1. A CPMK has no Sub-CPMK descendant.
2. A Sub-CPMK has no CPL correlation with value `> 0`.
3. A Sub-CPMK is not referenced by any `pertemuan` with `tipe = reguler`.
4. The total `bobot_penilaian_persen` across regular meetings is not `100` with tolerance `±0.01`.
5. A non-empty `catatan_penugasan` value exists in `rps_pertemuan`, but there is no `rps_rtm.nomor_tugas` with the same value.
6. An RTM has no entry in `rps_rtm_pertemuan`.

Two non-PRD checks are still enforced as product constraints:

1. `tanggalPenyusunan`, `deskripsiSingkat`, and `bahanKajian` must be filled.
2. At least one CPL, CPMK, and pertemuan must exist, and every CPMK must map to at least one CPL.

## Code Changes

`src/services/rps-workflow/submit.ts` now:

1. Counts CPMK without Sub-CPMK using `subCpmkEntries: { none: {} }` instead of using a global Sub-CPMK count.
2. Counts Sub-CPMK without positive CPL correlation using `korelasiCpl: { none: { persentase: { gt: 0 } } }`.
3. Counts Sub-CPMK without regular meeting references using `pertemuanEntries: { none: { tipe: "reguler" } }`.
4. Aggregates regular-meeting weight and blocks submit when the total differs from `100` by more than `0.01`.
5. Compares trimmed `catatan_penugasan` values against trimmed RTM `nomorTugas` values before submit.
6. Keeps the existing RTM-to-pertemuan hard blocker.

## Soft Warning Flow

Submit no longer uses non-PRD `console.warn` heuristics. Instead, the app now uses the PRD 4.2 warning set `W-01` through `W-04`, requires explicit acknowledgment before submit, and records each acknowledgment in `rps_approval_log` with `action = acknowledge_warning`.

Current behavior:

1. `GET /api/rps/[id]/validate` returns active warnings plus acknowledgment state for the current dosen pengembang and current RPS version.
2. `POST /api/rps/[id]/validate` acknowledges one active warning and writes the audit log entry.
3. Submit to RMK is blocked until every active warning has been acknowledged.
