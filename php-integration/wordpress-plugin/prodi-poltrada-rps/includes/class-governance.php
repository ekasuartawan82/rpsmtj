<?php

if (!defined('WPINC')) {
    die;
}

class Prodi_RPS_Governance_Service {
    private Prodi_RPS_DB $db;
    private ?Prodi_RPS_Validator $validator = null;

    // Authorization Matrix as Single Source of Truth
    private static array $matrix = [
        Prodi_RPS_DB::STATUS_DRAFT => [
            Prodi_RPS_DB::ROLE_DOSEN => ['submit_to_rmk', 'edit_data'],
            Prodi_RPS_DB::ROLE_ADMIN => ['submit_to_rmk', 'edit_data'],
        ],
        Prodi_RPS_DB::STATUS_SUBMITTED_TO_RMK => [
            Prodi_RPS_DB::ROLE_KOORDINATOR_RMK => ['approve_rmk', 'reject_rmk'],
        ],
        Prodi_RPS_DB::STATUS_REVISION_BY_RMK => [
            Prodi_RPS_DB::ROLE_DOSEN => ['submit_to_rmk', 'edit_data'],
            Prodi_RPS_DB::ROLE_ADMIN => ['submit_to_rmk', 'edit_data'],
        ],
        Prodi_RPS_DB::STATUS_SUBMITTED_TO_KAPRODI => [
            Prodi_RPS_DB::ROLE_KAPRODI => ['approve_kaprodi', 'reject_kaprodi'],
        ],
        Prodi_RPS_DB::STATUS_REVISION_BY_KAPRODI => [
            Prodi_RPS_DB::ROLE_DOSEN => ['submit_to_kaprodi', 'edit_data'],
            Prodi_RPS_DB::ROLE_ADMIN => ['submit_to_kaprodi', 'edit_data'],
        ],
        Prodi_RPS_DB::STATUS_APPROVED => [
            // No roles can edit or transition after approved.
        ],
    ];

    public function __construct(Prodi_RPS_DB $db) {
        $this->db = $db;
    }

    /**
     * Inject the validator (avoids a constructor cycle: the validator itself
     * depends on the DB). When set, submit_to_rmk enforces OBE hard blockers
     * and acknowledged-warnings checks before transitioning.
     */
    public function set_validator(Prodi_RPS_Validator $validator): void {
        $this->validator = $validator;
    }

    /**
     * Guard function: Check if action is allowed by matrix.
     */
    private function assert_action_allowed(string $state, string $role, string $action): void {
        if (!isset(self::$matrix[$state][$role]) || !in_array($action, self::$matrix[$state][$role], true)) {
            throw new RPS_Governance_Exception("Governance Error: Role '{$role}' is not allowed to '{$action}' when RPS status is '{$state}'.");
        }
    }

    /**
     * Anti-rubber-stamping guard. A reviewer cannot approve a document that
     * has changed since their last review.
     *
     * Rules:
     *  - First review (last_reviewed_at_by_<reviewer> is NULL) is always allowed.
     *  - Otherwise the document's last_changed_at must be <= the reviewer's
     *    last review timestamp. A newer change forces a fresh review.
     *
     * @param object $latest      Row locked via SELECT ... FOR UPDATE.
     * @param string $reviewer    'rmk' or 'kaprodi'.
     * @throws RPS_Governance_Exception when the review is stale.
     */
    private function assert_review_is_fresh(object $latest, string $reviewer): void {
        $reviewCol = 'last_reviewed_at_by_' . $reviewer;
        $lastReview = $latest->$reviewCol ?? null;
        $lastChanged = $latest->last_changed_at ?? null;

        // No prior review yet → this is the first review, always allowed.
        if ($lastReview === null) {
            return;
        }

        // If the doc changed strictly after the last review, block approval.
        if ($lastChanged !== null && strtotime((string) $lastChanged) > strtotime((string) $lastReview)) {
            $reviewerLabel = $reviewer === 'rmk' ? 'Koordinator RMK' : 'Kaprodi';
            throw new RPS_Governance_Exception(
                "Anti-rubber-stamping: dokumen RPS telah diubah sebelum review terakhir {$reviewerLabel}. " .
                "Dokumen harus direview ulang sebelum dapat disetujui."
            );
        }
    }

    /**
     * Check if the current actor can edit related data (CPL, CPMK, RTM, etc.)
     */
    public function can_edit_data(array $rps, array $actor): bool {
        try {
            // First check if the actor actually owns the RPS or is admin
            if (!$this->db->can_edit_rps($rps, $actor)) {
                return false;
            }
            $this->assert_action_allowed((string) $rps['status'], $actor['role'], 'edit_data');
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Perform state transition with atomic transaction and optimistic locking.
     *
     * Anti-rubber-stamping (freshness guard): a reviewer cannot approve a
     * document that changed after their last review (last_changed_at >
     * last_reviewed_at_by_<reviewer>). The first review is always allowed
     * (NULL review timestamp). On reject, the *other* reviewer's timestamp is
     * reset to NULL so both reviewers re-review the next revision.
     */
    private function execute_transition(int $rpsId, int $currentLockVersion, string $nextStatus, string $action, ?string $note, array $actor): bool {
        global $wpdb;

        $now = current_time('mysql');
        $rpsTable = Prodi_RPS_DB::table('rps');
        $logTable = Prodi_RPS_DB::table('rps_approval_log');

        // Whitelist allowed columns for governance transitions
        $allowedColumns = [
            'status',
            'workflow_status',
            'last_changed_at',
            'last_reviewed_at_by_rmk',
            'last_reviewed_at_by_kaprodi',
            'current_revision_count',
        ];

        $updates = [
            'workflow_status' => $nextStatus, // workflow_status is the canonical source of truth
            'status' => $nextStatus, // keep legacy status synced
            'last_changed_at' => $now,
        ];

        // Freshness guard: only applies to *approvals*. Rejects are allowed
        // regardless (a reviewer may always send back for revision).
        $reviewAction = $action === 'approve_rmk' ? 'rmk' : ($action === 'approve_kaprodi' ? 'kaprodi' : null);

        // 1. START TRANSACTION
        $wpdb->query("START TRANSACTION");

        try {
            // 2. Fetch latest state from DB inside transaction (include
            //    freshness timestamps so the guard uses authoritative data).
            $latest = $wpdb->get_row($wpdb->prepare(
                "SELECT workflow_status, lock_version, current_revision_count,
                        last_changed_at, last_reviewed_at_by_rmk, last_reviewed_at_by_kaprodi
                 FROM {$rpsTable} WHERE id = %d FOR UPDATE",
                $rpsId
            ));
            if (!$latest) {
                throw new RPS_Governance_Exception("RPS not found.");
            }

            // 3. Re-evaluate Guard using LATEST state from DB
            $this->assert_action_allowed($latest->workflow_status, $actor['role'], $action);

            // 3b. Freshness guard for approvals (anti-rubber-stamping).
            if ($reviewAction !== null) {
                $this->assert_review_is_fresh($latest, $reviewAction);
            }

            // 4. Optimistic locking: frontend's lock_version must match DB.
            if ((int) $latest->lock_version !== $currentLockVersion) {
                throw new RPS_Concurrency_Exception("Concurrency conflict: The RPS has been modified by another process. Version mismatch.");
            }

            // Stamp the acting reviewer's review timestamp.
            if ($action === 'approve_rmk' || $action === 'reject_rmk') {
                $updates['last_reviewed_at_by_rmk'] = $now;
            }
            if ($action === 'approve_kaprodi' || $action === 'reject_kaprodi') {
                $updates['last_reviewed_at_by_kaprodi'] = $now;
            }

            // On reject, reset the *other* reviewer's timestamp so they must
            // re-review the next revision (symmetric freshness reset).
            if ($action === 'reject_rmk') {
                $updates['last_reviewed_at_by_kaprodi'] = null;
            }
            if ($action === 'reject_kaprodi') {
                $updates['last_reviewed_at_by_rmk'] = null;
            }

            if ($action === 'reject_rmk' || $action === 'reject_kaprodi') {
                $updates['current_revision_count'] = (int) $latest->current_revision_count + 1;
            }

            // Build update query dynamically. NULL values are emitted as the
            // literal SQL keyword (not a %s placeholder) so $wpdb->prepare
            // does not coerce them to an empty string.
            $setClause = [];
            $values = [];
            foreach ($updates as $column => $value) {
                if (!in_array($column, $allowedColumns, true)) {
                    throw new RPS_Governance_Exception("Illegal transition column: {$column}");
                }
                if ($value === null) {
                    $setClause[] = "`{$column}` = NULL";
                } else {
                    $setClause[] = "`{$column}` = %s";
                    $values[] = $value;
                }
            }
            // Optimistic locking: Increment lock_version
            $setClause[] = "`lock_version` = `lock_version` + 1";
            
            $sql = "UPDATE {$rpsTable} SET " . implode(', ', $setClause) . " WHERE id = %d AND lock_version = %d";
            $values[] = $rpsId;
            $values[] = $currentLockVersion;

            // 5. Execute Update with Optimistic Lock
            $updatedRows = $wpdb->query($wpdb->prepare($sql, $values));

            if ($updatedRows === false) {
                throw new Exception("Database error during transition: " . $wpdb->last_error);
            }
            if ($updatedRows !== 1) {
                throw new RPS_Concurrency_Exception("Concurrency conflict or invalid transition.");
            }

            // 6. Insert Audit Log
            // lock_version in log acts as the lock_version snapshot of this transaction
            $logInserted = $wpdb->insert($logTable, [
                'rps_id' => $rpsId,
                'lock_version' => $currentLockVersion + 1,
                'actor_user_id' => (int) $actor['id'],
                'actor_role' => sanitize_text_field($actor['role']),
                'actor_name' => sanitize_text_field($actor['name']),
                'action' => sanitize_key($action),
                'catatan_review' => $note !== null ? sanitize_textarea_field($note) : null,
                'revision_round' => (int) $latest->current_revision_count + 1,
                'created_at' => $now,
            ], ['%d', '%d', '%d', '%s', '%s', '%s', '%s', '%d', '%s']);

            if ($logInserted === false) {
                throw new Exception("Failed to write audit log: " . $wpdb->last_error);
            }

            // 7. COMMIT
            $wpdb->query("COMMIT");
            return true;

        } catch (Exception $e) {
            $wpdb->query("ROLLBACK");
            throw $e;
        }
    }

    public function submit_to_rmk(int $rpsId, int $currentLockVersion, array $actor): bool {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) throw new RPS_Governance_Exception("RPS access denied or not found.");

        $this->assert_action_allowed((string) $rps['workflow_status'], $actor['role'], 'submit_to_rmk');

        // OBE compliance gate: hard blockers + acknowledged soft warnings.
        if ($this->validator) {
            $this->validator->assert_ready_for_submission($rpsId, $actor);
            $this->validator->assert_active_warnings_acknowledged($rpsId, $actor);
        }

        return $this->execute_transition($rpsId, $currentLockVersion, Prodi_RPS_DB::STATUS_SUBMITTED_TO_RMK, 'submit_to_rmk', null, $actor);
    }

    public function approve_rmk(int $rpsId, int $currentLockVersion, ?string $note, array $actor): bool {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) throw new RPS_Governance_Exception("RPS access denied or not found.");

        $this->assert_action_allowed((string) $rps['workflow_status'], $actor['role'], 'approve_rmk');

        return $this->execute_transition($rpsId, $currentLockVersion, Prodi_RPS_DB::STATUS_SUBMITTED_TO_KAPRODI, 'approve_rmk', $note, $actor);
    }

    public function reject_rmk(int $rpsId, int $currentLockVersion, ?string $note, array $actor): bool {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) throw new RPS_Governance_Exception("RPS access denied or not found.");

        $this->assert_action_allowed((string) $rps['workflow_status'], $actor['role'], 'reject_rmk');

        if (empty($note)) {
            throw new RPS_Input_Exception("Catatan wajib diisi saat menolak RPS.");
        }

        return $this->execute_transition($rpsId, $currentLockVersion, Prodi_RPS_DB::STATUS_REVISION_BY_RMK, 'reject_rmk', $note, $actor);
    }

    public function submit_to_kaprodi(int $rpsId, int $currentLockVersion, array $actor): bool {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) throw new RPS_Governance_Exception("RPS access denied or not found.");

        $this->assert_action_allowed((string) $rps['workflow_status'], $actor['role'], 'submit_to_kaprodi');

        return $this->execute_transition($rpsId, $currentLockVersion, Prodi_RPS_DB::STATUS_SUBMITTED_TO_KAPRODI, 'submit_to_kaprodi', null, $actor);
    }

    public function approve_kaprodi(int $rpsId, int $currentLockVersion, ?string $note, array $actor): bool {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) throw new RPS_Governance_Exception("RPS access denied or not found.");

        $this->assert_action_allowed((string) $rps['workflow_status'], $actor['role'], 'approve_kaprodi');

        return $this->execute_transition($rpsId, $currentLockVersion, Prodi_RPS_DB::STATUS_APPROVED, 'approve_kaprodi', $note, $actor);
    }

    public function reject_kaprodi(int $rpsId, int $currentLockVersion, ?string $note, array $actor): bool {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) throw new RPS_Governance_Exception("RPS access denied or not found.");

        $this->assert_action_allowed((string) $rps['workflow_status'], $actor['role'], 'reject_kaprodi');

        if (empty($note)) {
            throw new RPS_Input_Exception("Catatan wajib diisi saat menolak RPS.");
        }

        return $this->execute_transition($rpsId, $currentLockVersion, Prodi_RPS_DB::STATUS_REVISION_BY_KAPRODI, 'reject_kaprodi', $note, $actor);
    }

    public function update_rps_header(int $rpsId, int $currentLockVersion, array $data, array $actor): bool {
        global $wpdb;

        if (!$this->can_edit_data(['id' => $rpsId, 'status' => $this->db->get_rps_detail($rpsId, $actor)['workflow_status'] ?? ''], $actor)) {
            return false;
        }

        $now = current_time('mysql');
        $rpsTable = Prodi_RPS_DB::table('rps');
        $logTable = Prodi_RPS_DB::table('rps_approval_log');

        $wpdb->query("START TRANSACTION");

        try {
            $latest = $wpdb->get_row($wpdb->prepare("SELECT lock_version FROM {$rpsTable} WHERE id = %d FOR UPDATE", $rpsId));
            if (!$latest || (int) $latest->lock_version !== $currentLockVersion) {
                throw new RPS_Concurrency_Exception("Concurrency conflict: The RPS has been modified by another process. Version mismatch.");
            }

            $sql = $wpdb->prepare("UPDATE {$rpsTable} SET 
                tanggal_penyusunan = %s,
                deskripsi_singkat = %s,
                bahan_kajian = %s,
                catatan_tambahan = %s,
                last_changed_at = %s,
                lock_version = lock_version + 1
                WHERE id = %d AND lock_version = %d",
                sanitize_text_field((string) $data['tanggal_penyusunan']),
                wp_kses_post((string) $data['deskripsi_singkat']),
                wp_kses_post((string) $data['bahan_kajian']),
                wp_kses_post((string) $data['catatan_tambahan']),
                $now,
                $rpsId,
                $currentLockVersion
            );

            $updatedRows = $wpdb->query($sql);

            if ($updatedRows === false) {
                throw new Exception("Database error during update: " . $wpdb->last_error);
            }
            if ($updatedRows !== 1) {
                throw new RPS_Concurrency_Exception("Concurrency conflict or invalid update.");
            }

            $logInserted = $wpdb->insert($logTable, [
                'rps_id' => $rpsId,
                'lock_version' => $currentLockVersion + 1,
                'actor_user_id' => (int) $actor['id'],
                'actor_role' => sanitize_text_field($actor['role']),
                'actor_name' => sanitize_text_field($actor['name']),
                'action' => 'update_header',
                'revision_round' => 0,
                'created_at' => $now,
            ], ['%d', '%d', '%d', '%s', '%s', '%s', '%d', '%s']);

            if ($logInserted === false) {
                throw new Exception("Failed to write audit log: " . $wpdb->last_error);
            }

            $wpdb->query("COMMIT");
            return true;

        } catch (Exception $e) {
            $wpdb->query("ROLLBACK");
            throw $e;
        }
    }
}
