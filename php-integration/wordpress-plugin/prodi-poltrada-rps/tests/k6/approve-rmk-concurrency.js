import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  iterations: 10,
  thresholds: {
    checks: ['rate>0.95'],
  },
};

const BASE_URL = __ENV.BASE_URL;
const COOKIE = __ENV.COOKIE;
const NONCE = __ENV.NONCE;
const RPS_ID = __ENV.RPS_ID;
const LOCK_VERSION = __ENV.LOCK_VERSION;

export default function () {
  const url = `${BASE_URL}/wp-admin/admin-ajax.php`;
  const payload = [
    `action=${encodeURIComponent('prodi_rps_approve_rmk')}`,
    `nonce=${encodeURIComponent(NONCE)}`,
    `rps_id=${encodeURIComponent(RPS_ID)}`,
    `lock_version=${encodeURIComponent(LOCK_VERSION)}`
  ].join('&');

  const params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': COOKIE,
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
    'response is json': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.1);
}
