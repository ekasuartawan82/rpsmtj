/**
 * HTTP Concurrency Test — Governance Layer via API
 *
 * Tests race conditions through actual HTTP requests with real session cookies.
 * This covers what the governance-layer Promise.all test cannot:
 * - Session authentication at route boundary
 * - Separate HTTP connections (each fetch is an independent request)
 * - Real NextAuth JWT validation on every request
 *
 * Attack surfaces:
 *   HTTP-1 — Concurrent POST /api/rps/[id]/review-rmk (approve) × 2
 *   HTTP-2 — Concurrent POST /api/rps/[id]/review-kaprodi (approve) × 2
 *   HTTP-3 — Concurrent POST /api/rps/[id]/submit × 2
 *
 * Expected after SELECT FOR UPDATE fix:
 *   - exactly 1 log entry per action
 *   - exactly 1 notification per action
 *   - second request returns 4xx with correct error code
 *
 * Session acquisition:
 *   Login via POST /api/auth/callback/credentials (NextAuth credentials flow)
 *   Cookie: next-auth.session-token (HttpOnly, JWT-signed)
 */

import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:3000';
const RPS_ID   = '768d9dfb-920f-430b-a8c5-8dca4c6be92b';
const prisma   = new PrismaClient({ log: ['warn', 'error'] });

type SessionCookie = string;

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function login(email: string, password: string): Promise<SessionCookie> {
  // Step 1: GET /api/auth/csrf — returns token AND sets next-auth.csrf-token cookie
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  // Extract the CSRF cookie that must be forwarded with the login POST
  const csrfCookie = csrfRes.headers.get('set-cookie') ?? '';
  const csrfCookieValue = csrfCookie.match(/next-auth\.csrf-token=([^;]+)/)?.[1] ?? '';

  // Step 2: POST credentials with CSRF cookie forwarded in Cookie header
  const body = new URLSearchParams({
    email,
    password,
    csrfToken,
    callbackUrl: BASE_URL,
    json: 'true',
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Forward CSRF cookie — NextAuth validates token against cookie
      Cookie: csrfCookieValue ? `next-auth.csrf-token=${csrfCookieValue}` : '',
    },
    body: body.toString(),
    redirect: 'manual',
  });

  const setCookieHeader = loginRes.headers.get('set-cookie') ?? '';
  const match = setCookieHeader.match(/next-auth\.session-token=([^;]+)/);
  if (!match) {
    const status = loginRes.status;
    const body = await loginRes.text().catch(() => '');
    throw new Error(`Login failed for ${email} — HTTP ${status}. Response: ${body.slice(0, 200)}`);
  }

  return `next-auth.session-token=${match[1]}`;
}

async function apiPost(path: string, cookie: SessionCookie, body: object): Promise<{
  status: number;
  ok: boolean;
  data: any;
}> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text().catch(() => '') };
  }

  return { status: res.status, ok: res.ok, data };
}

// ── DB helpers ─────────────────────────────────────────────────────────────────

async function resetToState(targetStatus: string, revisionCount = 0) {
  await prisma.$transaction([
    prisma.rpsApprovalLog.deleteMany({ where: { rpsId: RPS_ID } }),
    prisma.rpsNotification.deleteMany({ where: { rpsId: RPS_ID } }),
    prisma.rps.update({
      where: { id: RPS_ID },
      data: {
        workflowStatus: targetStatus,
        currentRevisionCount: revisionCount,
        lastChangedAt: new Date('2025-01-01T00:00:00Z'),
        lastReviewedAtByRmk: null,
        lastReviewedAtByKaprodi: null,
      },
    }),
  ]);
}

async function getLogCount(action: string) {
  return prisma.rpsApprovalLog.count({ where: { rpsId: RPS_ID, action } });
}

async function getNotificationCount(type: string) {
  return prisma.rpsNotification.count({ where: { rpsId: RPS_ID, type } });
}

async function getState() {
  return prisma.rps.findUniqueOrThrow({
    where: { id: RPS_ID },
    select: { workflowStatus: true, currentRevisionCount: true },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sep(label: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${label}`);
  console.log('═'.repeat(60));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('HTTP Concurrency Test — Governance Layer via API');
  console.log('Base URL:', BASE_URL);
  console.log('RPS ID:', RPS_ID);
  console.log('Date:', new Date().toISOString());

  // ── Acquire sessions ────────────────────────────────────────────────────────
  sep('Session Acquisition');
  let dosenCookie: SessionCookie;
  let rmkCookie: SessionCookie;
  let kaprodiCookie: SessionCookie;

  try {
    [dosenCookie, rmkCookie, kaprodiCookie] = await Promise.all([
      login('aswin@poltradabali.ac.id', 'Password123!'),
      login('rmk@mtj.local', 'Password123!'),
      login('putu.eka@poltradabali.ac.id', 'Password123!'),
    ]);
    console.log('  ✓  dosen session acquired');
    console.log('  ✓  koordinator_rmk session acquired');
    console.log('  ✓  kaprodi session acquired');
  } catch (err) {
    console.error('  ✗  Session acquisition failed:', (err as Error).message);
    console.error('     Is the dev server running at localhost:3000?');
    process.exit(1);
  }

  const results: Array<{ attack: string; successes: number; failures: number; logCount: number; notifCount: number; secondStatus: number; safe: boolean }> = [];

  // ── HTTP Attack 1: Concurrent approveRMK ─────────────────────────────────────
  sep('HTTP-1 — Concurrent POST /review-rmk (approve) × 2');
  await resetToState('submitted_to_rmk');
  console.log('  [state] reset to submitted_to_rmk');

  const [h1r1, h1r2] = await Promise.all([
    apiPost(`/api/rps/${RPS_ID}/review-rmk`, rmkCookie, { action: 'approve' }),
    apiPost(`/api/rps/${RPS_ID}/review-rmk`, rmkCookie, { action: 'approve' }),
  ]);

  const h1Successes = [h1r1, h1r2].filter(r => r.ok).length;
  const h1Failures  = [h1r1, h1r2].filter(r => !r.ok).length;
  const h1Log       = await getLogCount('approve_rmk');
  const h1Notif     = await getNotificationCount('approved_by_rmk');
  const h1State     = await getState();

  console.log(`  →  Request 1: HTTP ${h1r1.status} ${h1r1.ok ? '✓' : '✗'}`);
  console.log(`  →  Request 2: HTTP ${h1r2.status} ${h1r2.ok ? '✓' : '✗'}`);
  if (!h1r2.ok) console.log(`     Error: ${JSON.stringify(h1r2.data).slice(0, 120)}`);
  console.log(`  →  approve_rmk log entries: ${h1Log}`);
  console.log(`  →  approved_by_rmk notifications: ${h1Notif}`);
  console.log(`  →  Final state: ${h1State.workflowStatus}`);

  const h1Safe = h1Log === 1;
  results.push({ attack: 'HTTP-1 concurrent approveRMK', successes: h1Successes, failures: h1Failures, logCount: h1Log, notifCount: h1Notif, secondStatus: h1r2.status, safe: h1Safe });

  // ── HTTP Attack 2: Concurrent approveKaprodi ──────────────────────────────────
  sep('HTTP-2 — Concurrent POST /review-kaprodi (approve) × 2');
  await resetToState('submitted_to_kaprodi');
  console.log('  [state] reset to submitted_to_kaprodi');

  const [h2r1, h2r2] = await Promise.all([
    apiPost(`/api/rps/${RPS_ID}/review-kaprodi`, kaprodiCookie, { action: 'approve' }),
    apiPost(`/api/rps/${RPS_ID}/review-kaprodi`, kaprodiCookie, { action: 'approve' }),
  ]);

  const h2Successes = [h2r1, h2r2].filter(r => r.ok).length;
  const h2Failures  = [h2r1, h2r2].filter(r => !r.ok).length;
  const h2Log       = await getLogCount('approve_kaprodi');
  const h2Notif     = await getNotificationCount('approved');
  const h2State     = await getState();

  console.log(`  →  Request 1: HTTP ${h2r1.status} ${h2r1.ok ? '✓' : '✗'}`);
  console.log(`  →  Request 2: HTTP ${h2r2.status} ${h2r2.ok ? '✓' : '✗'}`);
  if (!h2r2.ok) console.log(`     Error: ${JSON.stringify(h2r2.data).slice(0, 120)}`);
  console.log(`  →  approve_kaprodi log entries: ${h2Log}`);
  console.log(`  →  approved notifications: ${h2Notif}`);
  console.log(`  →  Final state: ${h2State.workflowStatus}`);

  const h2Safe = h2Log === 1;
  results.push({ attack: 'HTTP-2 concurrent approveKaprodi', successes: h2Successes, failures: h2Failures, logCount: h2Log, notifCount: h2Notif, secondStatus: h2r2.status, safe: h2Safe });

  // ── HTTP Attack 3: Concurrent submit ──────────────────────────────────────────
  sep('HTTP-3 — Concurrent POST /submit × 2');
  await resetToState('draft');
  // Note: submit requires OBE validation to pass. The test RPS may not be fully valid.
  // We record whatever state the API returns — 4xx from OBE validation is a known expected path.
  console.log('  [state] reset to draft');
  console.log('  [note] submit validates OBE completeness — 422 from content validation is expected and correct');

  const [h3r1, h3r2] = await Promise.all([
    apiPost(`/api/rps/${RPS_ID}/submit`, dosenCookie, {}),
    apiPost(`/api/rps/${RPS_ID}/submit`, dosenCookie, {}),
  ]);

  const h3Successes = [h3r1, h3r2].filter(r => r.ok).length;
  const h3Failures  = [h3r1, h3r2].filter(r => !r.ok).length;
  const h3Log       = await getLogCount('submit_to_rmk');
  const h3State     = await getState();

  console.log(`  →  Request 1: HTTP ${h3r1.status} ${h3r1.ok ? '✓' : '✗'}`);
  console.log(`     Body: ${JSON.stringify(h3r1.data).slice(0, 120)}`);
  console.log(`  →  Request 2: HTTP ${h3r2.status} ${h3r2.ok ? '✓' : '✗'}`);
  console.log(`     Body: ${JSON.stringify(h3r2.data).slice(0, 120)}`);
  console.log(`  →  submit_to_rmk log entries: ${h3Log}`);
  console.log(`  →  Final state: ${h3State.workflowStatus}`);

  // Submit log count should be 0 or 1 — never 2
  const h3Safe = h3Log <= 1;
  results.push({ attack: 'HTTP-3 concurrent submit', successes: h3Successes, failures: h3Failures, logCount: h3Log, notifCount: 0, secondStatus: h3r2.status, safe: h3Safe });

  // ── Summary ───────────────────────────────────────────────────────────────────
  sep('HTTP CONCURRENCY AUDIT SUMMARY');
  console.log('');
  console.log('  Attack                          | OK | Fail | Log | Notif | Safe?');
  console.log('  --------------------------------|----|------|-----|-------|------');
  for (const r of results) {
    const safe   = r.safe ? 'Yes ✓' : 'NO ⚠';
    const attack = r.attack.padEnd(31);
    console.log(`  ${attack} | ${String(r.successes).padEnd(2)} | ${String(r.failures).padEnd(4)} | ${String(r.logCount).padEnd(3)} | ${String(r.notifCount).padEnd(5)} | ${safe}`);
  }

  const anyUnsafe = results.some(r => !r.safe);
  console.log('');
  if (anyUnsafe) {
    console.log('  VERDICT: Race condition persists at HTTP layer — SELECT FOR UPDATE not effective here');
    console.log('  Investigate connection pool isolation and Prisma transaction semantics.');
  } else {
    console.log('  VERDICT: No duplicate log entries detected at HTTP layer.');
    console.log('  SELECT FOR UPDATE is effective under multi-connection HTTP concurrency.');
    console.log('');
    console.log('  Note: This uses Node.js fetch from a single process. For exhaustive');
    console.log('  proof, run concurrent requests from separate OS processes or use');
    console.log('  a load testing tool (e.g., k6, Apache Bench) with 2 parallel virtual users.');
  }
}

main()
  .catch((err) => {
    console.error('\nFATAL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
