import http from "k6/http";
import { check, group, sleep } from "k6";

export const options = {
  vus: 100,
  duration: "5m",
  thresholds: {
    http_req_duration: ["p(99)<3000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY || "test-api-key";
const AGENT_ID = __ENV.AGENT_ID || "default-agent";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};

export default function () {
  let sessionId;

  group("Create Session", () => {
    const payload = JSON.stringify({
      agentId: AGENT_ID,
      metadata: {
        source: "k6-load-test",
        vu: __VU,
        iter: __ITER,
      },
    });

    const res = http.post(`${BASE_URL}/api/v1/sessions`, payload, { headers });

    check(res, {
      "session created (201)": (r) => r.status === 201,
      "response has session id": (r) => {
        const body = JSON.parse(r.body);
        sessionId = body.id || body.sessionId;
        return !!sessionId;
      },
    });
  });

  if (!sessionId) {
    console.warn(`VU ${__VU}: Failed to create session, skipping messages`);
    sleep(1);
    return;
  }

  sleep(0.5);

  const messages = [
    "Hello, how are you?",
    "Can you help me with a task?",
    "Thank you for your help.",
  ];

  for (let i = 0; i < messages.length; i++) {
    group(`Send Message ${i + 1}`, () => {
      const payload = JSON.stringify({
        content: messages[i],
        role: "user",
      });

      const res = http.post(
        `${BASE_URL}/api/v1/sessions/${sessionId}/messages`,
        payload,
        {
          headers: {
            ...headers,
            Accept: "text/event-stream",
          },
          timeout: "30s",
        }
      );

      check(res, {
        "message accepted (200 or 201)": (r) =>
          r.status === 200 || r.status === 201,
        "response time < 3s": (r) => r.timings.duration < 3000,
        "response has content": (r) => r.body && r.body.length > 0,
      });
    });

    sleep(1);
  }

  group("Get Session History", () => {
    const res = http.get(
      `${BASE_URL}/api/v1/sessions/${sessionId}/messages`,
      { headers }
    );

    check(res, {
      "history retrieved (200)": (r) => r.status === 200,
      "history contains messages": (r) => {
        const body = JSON.parse(r.body);
        const msgs = body.messages || body;
        return Array.isArray(msgs) && msgs.length >= 3;
      },
    });
  });

  sleep(0.5);

  group("Close Session", () => {
    const res = http.post(
      `${BASE_URL}/api/v1/sessions/${sessionId}/close`,
      null,
      { headers }
    );

    check(res, {
      "session closed (200)": (r) => r.status === 200,
    });
  });

  sleep(1);
}
