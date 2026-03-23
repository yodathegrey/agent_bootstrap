import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const healthErrors = new Rate("health_errors");
const agentErrors = new Rate("agent_errors");
const sessionErrors = new Rate("session_errors");
const healthDuration = new Trend("health_duration");
const agentDuration = new Trend("agent_duration");
const sessionDuration = new Trend("session_duration");

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "5m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<3000"],
    http_req_failed: ["rate<0.05"],
    health_errors: ["rate<0.01"],
    agent_errors: ["rate<0.05"],
    session_errors: ["rate<0.05"],
    health_duration: ["p(95)<200"],
    agent_duration: ["p(95)<500"],
    session_duration: ["p(99)<3000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY || "test-api-key";
const AGENT_ID = __ENV.AGENT_ID || "default-agent";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};

// Traffic distribution: 40% health, 30% agents, 30% sessions
function pickScenario() {
  const rand = Math.random();
  if (rand < 0.4) return "health";
  if (rand < 0.7) return "agents";
  return "sessions";
}

// ---------- Health Check Scenario ----------

function healthCheck() {
  group("Health Check", () => {
    const res = http.get(`${BASE_URL}/api/v1/health`);

    const success = check(res, {
      "health: status 200": (r) => r.status === 200,
      "health: response time < 200ms": (r) => r.timings.duration < 200,
    });

    healthErrors.add(!success);
    healthDuration.add(res.timings.duration);
  });

  sleep(0.1);
}

// ---------- Agent Operations Scenario ----------

function agentOperations() {
  let agentId;

  group("Agent CRUD", () => {
    // Create
    const createPayload = JSON.stringify({
      name: `load-agent-${__VU}-${__ITER}`,
      description: "Full load test agent",
      model: "gpt-4o",
      systemPrompt: "You are a helpful assistant.",
      skills: [],
    });

    const createRes = http.post(`${BASE_URL}/api/v1/agents`, createPayload, {
      headers,
    });

    const createOk = check(createRes, {
      "agent: created (201)": (r) => r.status === 201,
    });

    if (createOk) {
      const body = JSON.parse(createRes.body);
      agentId = body.id;
    }

    agentErrors.add(!createOk);
    agentDuration.add(createRes.timings.duration);

    sleep(0.3);

    // List
    const listRes = http.get(`${BASE_URL}/api/v1/agents`, { headers });
    const listOk = check(listRes, {
      "agent: list (200)": (r) => r.status === 200,
    });
    agentErrors.add(!listOk);
    agentDuration.add(listRes.timings.duration);

    sleep(0.3);

    // Get, Update, Delete
    if (agentId) {
      const getRes = http.get(`${BASE_URL}/api/v1/agents/${agentId}`, {
        headers,
      });
      check(getRes, { "agent: get (200)": (r) => r.status === 200 });
      agentDuration.add(getRes.timings.duration);

      sleep(0.2);

      const updatePayload = JSON.stringify({ description: "Updated in full load test" });
      const updateRes = http.patch(
        `${BASE_URL}/api/v1/agents/${agentId}`,
        updatePayload,
        { headers }
      );
      check(updateRes, { "agent: updated (200)": (r) => r.status === 200 });
      agentDuration.add(updateRes.timings.duration);

      sleep(0.2);

      const delRes = http.del(`${BASE_URL}/api/v1/agents/${agentId}`, null, {
        headers,
      });
      check(delRes, {
        "agent: deleted": (r) => r.status === 204 || r.status === 200,
      });
      agentDuration.add(delRes.timings.duration);
    }
  });

  sleep(1);
}

// ---------- Session Scenario ----------

function sessionFlow() {
  let sessionId;

  group("Session Flow", () => {
    // Create session
    const createPayload = JSON.stringify({
      agentId: AGENT_ID,
      metadata: { source: "k6-full-load", vu: __VU, iter: __ITER },
    });

    const createRes = http.post(`${BASE_URL}/api/v1/sessions`, createPayload, {
      headers,
    });

    const createOk = check(createRes, {
      "session: created (201)": (r) => r.status === 201,
    });

    if (createOk) {
      const body = JSON.parse(createRes.body);
      sessionId = body.id || body.sessionId;
    }

    sessionErrors.add(!createOk);
    sessionDuration.add(createRes.timings.duration);

    if (!sessionId) return;

    sleep(0.5);

    // Send 3 messages
    const messages = [
      "Hello, I need help.",
      "Can you explain how this works?",
      "Thanks, that is clear.",
    ];

    for (const msg of messages) {
      const msgPayload = JSON.stringify({ content: msg, role: "user" });
      const msgRes = http.post(
        `${BASE_URL}/api/v1/sessions/${sessionId}/messages`,
        msgPayload,
        {
          headers: { ...headers, Accept: "text/event-stream" },
          timeout: "30s",
        }
      );

      const msgOk = check(msgRes, {
        "session: message accepted": (r) =>
          r.status === 200 || r.status === 201,
        "session: response time < 3s": (r) => r.timings.duration < 3000,
      });

      sessionErrors.add(!msgOk);
      sessionDuration.add(msgRes.timings.duration);
      sleep(1);
    }

    // Close session
    const closeRes = http.post(
      `${BASE_URL}/api/v1/sessions/${sessionId}/close`,
      null,
      { headers }
    );
    check(closeRes, { "session: closed (200)": (r) => r.status === 200 });
    sessionDuration.add(closeRes.timings.duration);
  });

  sleep(1);
}

// ---------- Main ----------

export default function () {
  const scenario = pickScenario();

  switch (scenario) {
    case "health":
      healthCheck();
      break;
    case "agents":
      agentOperations();
      break;
    case "sessions":
      sessionFlow();
      break;
  }
}
