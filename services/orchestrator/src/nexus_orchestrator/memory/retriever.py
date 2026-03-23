"""Long-term memory retrieval using vector similarity search."""

import json
import logging
import math
from typing import Optional

import httpx

from ..config import Settings

logger = logging.getLogger(__name__)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(a) != len(b) or len(a) == 0:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def generate_query_embedding(text: str, settings: Settings) -> list[float]:
    """Generate embedding for a query using the LLM Router or Vertex AI."""
    if not settings.GCP_PROJECT_ID:
        logger.warning("No GCP_PROJECT_ID, returning zero vector for query embedding")
        return [0.0] * 768

    location = "us-central1"
    url = (
        f"https://{location}-aiplatform.googleapis.com/v1/projects/"
        f"{settings.GCP_PROJECT_ID}/locations/{location}/publishers/google/"
        f"models/text-embedding-005:predict"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try to get access token from metadata server
            try:
                token_resp = await client.get(
                    "http://metadata.google.internal/computeMetadata/v1/"
                    "instance/service-accounts/default/token",
                    headers={"Metadata-Flavor": "Google"},
                )
                token_data = token_resp.json()
                access_token = token_data["access_token"]
            except Exception:
                logger.warning("Cannot get GCP token, returning zero vector")
                return [0.0] * 768

            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={"instances": [{"content": text[:2048]}]},
            )

            if resp.status_code != 200:
                logger.warning(f"Embedding API error {resp.status_code}")
                return [0.0] * 768

            data = resp.json()
            return data["predictions"][0]["embeddings"]["values"]
    except Exception as e:
        logger.warning(f"Failed to generate query embedding: {e}")
        return [0.0] * 768


class MemoryRetriever:
    """Retrieves relevant long-term memories using vector similarity."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._firestore = None

    def _get_firestore(self):
        if self._firestore is None:
            try:
                from google.cloud import firestore
                self._firestore = firestore.AsyncClient()
            except Exception:
                logger.warning("Firestore not available for memory retrieval")
                return None
        return self._firestore

    async def retrieve(
        self,
        org_id: str,
        agent_id: str,
        query_text: str,
        top_k: int = 5,
        tag_filters: Optional[list[str]] = None,
    ) -> list[dict]:
        """Retrieve top-K relevant memories for the given query.

        In production, this would use Vertex AI Vector Search for efficient
        nearest-neighbor lookup. For now, we do a brute-force scan of
        Firestore documents with in-memory cosine similarity.
        """
        db = self._get_firestore()
        if db is None:
            logger.info("No Firestore available, returning empty memories")
            return []

        try:
            query_embedding = await generate_query_embedding(
                query_text, self.settings
            )

            # Query memories for this org and agent
            collection = db.collection(f"orgs/{org_id}/memory")
            query = collection.where("agent_id", "==", agent_id)

            if tag_filters:
                # Firestore array-contains can only filter one tag at a time
                query = query.where("tags", "array_contains", tag_filters[0])

            docs = []
            async for doc in query.stream():
                docs.append(doc.to_dict())

            if not docs:
                return []

            # Compute similarities and rank
            scored = []
            for doc in docs:
                embedding = doc.get("embedding", [])
                if not embedding or all(v == 0 for v in embedding):
                    continue
                score = cosine_similarity(query_embedding, embedding)
                scored.append({
                    "summary": doc.get("summary", ""),
                    "tags": doc.get("tags", []),
                    "relevance_score": score,
                    "created_at": doc.get("created_at", ""),
                })

            # Sort by relevance and return top-K
            scored.sort(key=lambda x: x["relevance_score"], reverse=True)
            return scored[:top_k]

        except Exception as e:
            logger.error(f"Failed to retrieve memories: {e}")
            return []
