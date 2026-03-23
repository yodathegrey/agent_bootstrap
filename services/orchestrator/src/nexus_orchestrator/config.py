"""Application configuration via Pydantic settings."""

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Orchestrator service configuration.

    Values are read from environment variables (case-insensitive).
    """

    GRPC_PORT: int = Field(default=50051, description="gRPC server listen port")
    HEALTH_PORT: int = Field(default=8080, description="HTTP health-check port")
    LLM_ROUTER_URL: str = Field(
        default="http://localhost:3001",
        description="Base URL of the LLM Router service",
    )
    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    GCP_PROJECT_ID: str | None = Field(
        default=None, description="GCP project ID for Pub/Sub and Firestore"
    )
    PUBSUB_AGENT_TOPIC: str = Field(
        default="agent-events", description="Pub/Sub topic for agent lifecycle events"
    )
    PUBSUB_MEMORY_TOPIC: str = Field(
        default="memory-events", description="Pub/Sub topic for memory flush events"
    )

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
