import http from "k6/http";
import { check, group, sleep } from "k6";

export const options = {
  vus: 50,
  duration: "2m",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY || "test-api-key";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};

export default function () {
  let agentId;

  group("Create Agent", () => {
    const payload = JSON.stringify({
      name: `load-test-agent-${__VU}-${__ITER}`,
      description: "Agent created by k6 load test",
      model: "gpt-4o",
      systemPrompt: "You are a helpful assistant.",
      skills: [],
    });

    const res = http.post(`${BASE_URL}/api/v1/agents`, payload, { headers });

    check(res, {
      "agent created (201)": (r) => r.status === 201,
      "response has id": (r) => {
        const body = JSON.parse(r.body);
        agentId = body.id;
        return !!agentId;
      },
    });
  });

  sleep(0.5);

  group("List Agents", () => {
    const res = http.get(`${BASE_URL}/api/v1/agents`, { headers });

    check(res, {
      "list agents (200)": (r) => r.status === 200,
      "response is array": (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.agents || body);
      },
    });
  });

  sleep(0.3);

  if (agentId) {
    group("Get Agent", () => {
      const res = http.get(`${BASE_URL}/api/v1/agents/${agentId}`, {
        headers,
      });

      check(res, {
        "get agent (200)": (r) => r.status === 200,
        "correct agent returned": (r) => {
          const body = JSON.parse(r.body);
          return body.id === agentId;
        },
      });
    });

    sleep(0.3);

    group("Update Agent", () => {
      const payload = JSON.stringify({
        description: "Updated by k6 load test",
      });

      const res = http.patch(`${BASE_URL}/api/v1/agents/${agentId}`, payload, {
        headers,
      });

      check(res, {
        "agent updated (200)": (r) => r.status === 200,
      });
    });

    sleep(0.3);

    group("Delete Agent", () => {
      const res = http.del(`${BASE_URL}/api/v1/agents/${agentId}`, null, {
        headers,
      });

      check(res, {
        "agent deleted (204 or 200)": (r) =>
          r.status === 204 || r.status === 200,
      });
    });
  }

  sleep(1);
}
