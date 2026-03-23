import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 100,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<200"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/health`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 200ms": (r) => r.timings.duration < 200,
    "body contains status": (r) => {
      const body = JSON.parse(r.body);
      return body.status === "ok" || body.status === "healthy";
    },
  });

  sleep(0.1);
}
