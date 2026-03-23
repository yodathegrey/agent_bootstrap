import { cloudEvent, CloudEvent } from '@google-cloud/functions-framework';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { createClient } from 'redis';

const firestore = new Firestore();

interface MemoryFlushEvent {
  org_id: string;
  session_id: string;
  agent_id: string;
  user_id: string;
  scratchpad: string;
  turn_history: Array<{ role: string; summary: string }>;
  tags: string[];
}

interface PubSubData {
  message: {
    data: string;
  };
}

/**
 * Generate a text embedding using Vertex AI text-embedding API.
 * Falls back to a zero vector if the API is not available.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

  if (!projectId) {
    console.warn('GCP_PROJECT_ID not set, using zero vector for embedding');
    return new Array(768).fill(0);
  }

  try {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-005:predict`;

    // Use Application Default Credentials
    const tokenRes = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } },
    );

    if (!tokenRes.ok) {
      console.warn('Could not get GCP access token, using zero vector');
      return new Array(768).fill(0);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ content: text.slice(0, 2048) }],
      }),
    });

    if (!response.ok) {
      console.warn(`Vertex AI embedding API error ${response.status}, using zero vector`);
      return new Array(768).fill(0);
    }

    const data = (await response.json()) as {
      predictions: Array<{ embeddings: { values: number[] } }>;
    };

    return data.predictions[0]?.embeddings?.values || new Array(768).fill(0);
  } catch (err) {
    console.warn('Failed to generate embedding, using zero vector:', err);
    return new Array(768).fill(0);
  }
}

cloudEvent('memoryWriter', async (event: CloudEvent<PubSubData>) => {
  const data = event.data;
  if (!data?.message?.data) {
    console.error('No data in event');
    return;
  }

  const payload: MemoryFlushEvent = JSON.parse(
    Buffer.from(data.message.data, 'base64').toString(),
  );

  console.log(`Processing memory flush for session ${payload.session_id}`);

  const summary = payload.scratchpad || 'No scratchpad content';

  // Generate vector embedding for semantic search
  const embedding = await generateEmbedding(summary);

  // Write long-term memory entry to Firestore
  const memoryRef = firestore
    .collection(`orgs/${payload.org_id}/memory`)
    .doc();

  const memoryEntry = {
    agent_id: payload.agent_id,
    user_id: payload.user_id,
    summary,
    embedding,
    tags: payload.tags || [],
    created_at: new Date().toISOString(),
    ttl: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
  };

  await memoryRef.set(memoryEntry);
  console.log(`Written long-term memory ${memoryRef.id} with ${embedding.length}-dim embedding`);

  // Clean up kernel memory from Redis
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

  try {
    const redis = createClient({ url: `redis://${redisHost}:${redisPort}` });
    await redis.connect();
    await redis.del(`kernel:${payload.session_id}`);
    await redis.disconnect();
    console.log(`Flushed kernel memory for session ${payload.session_id}`);
  } catch (err) {
    console.error('Failed to flush Redis kernel memory:', err);
  }
});
