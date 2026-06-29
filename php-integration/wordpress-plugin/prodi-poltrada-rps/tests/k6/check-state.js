import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

const BASE_URL = __ENV.BASE_URL;
const COOKIE = __ENV.COOKIE;
const NONCE = __ENV.NONCE;
const RPS_ID = __ENV.RPS_ID;

export default function () {
  const url = `${BASE_URL}/wp-admin/admin-ajax.php`;
  const payload = {
    action: 'prodi_rps_test_state',
    nonce: NONCE,
    rps_id: RPS_ID,
  };

  const params = {
    headers: {
      Cookie: COOKIE,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const res = http.post(url, payload, params);
  console.log(res.body);

  check(res, {
    'state check ok': (r) => r.status === 200,
  });
}
