FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency files first for caching
COPY pyproject.toml ./

# Install dependencies
RUN uv sync --no-dev

# Copy source code
COPY src/ src/

EXPOSE 50051 8080

CMD ["python", "-m", "nexus_orchestrator.main"]
