PROTO_DIR := ../../packages/proto
PROTO_OUT := src/nexus_orchestrator/proto

.PHONY: proto dev test lint

proto:
	python -m grpc_tools.protoc \
		-I$(PROTO_DIR) \
		--python_out=$(PROTO_OUT) \
		--grpc_python_out=$(PROTO_OUT) \
		$(PROTO_DIR)/*.proto

dev:
	uv run python -m nexus_orchestrator.main

test:
	uv run pytest tests/ -v

lint:
	uv run ruff check src/ tests/
