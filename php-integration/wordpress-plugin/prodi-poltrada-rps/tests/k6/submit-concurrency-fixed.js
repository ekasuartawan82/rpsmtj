import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  iterations: 10,
};

const BASE_URL = __ENV.BASE_URL;
const COOKIE = __ENV.COOKIE;
const NONCE = __ENV.NONCE;
const RPS_ID = __ENV.RPS_ID;
const LOCK_VERSION = __ENV.LOCK_VERSION;

export default function () {
  const url = `${BASE_URL}/wp-admin/admin-ajax.php`;

  // URL-encode the payload for WordPress AJAX
  const payload = `action=prodi_rps_submit_to_rmk&nonce=${encodeURIComponent(NONCE)}&rps_id=${RPS_ID}&lock_version=${LOCK_VERSION}`;

  const params = {
    headers: {
      Cookie: COOKIE,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
  });

  if (res.status !== 200 && res.status !== 409) {
      console.log(`Unexpected status: ${res.status}, body: ${res.body}`);
  }
}
