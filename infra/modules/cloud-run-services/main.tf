resource "google_cloud_run_v2_service" "api_gateway" {
  name     = "${var.environment}-nexus-api-gateway"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    max_instance_request_concurrency = 80

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.environment}-nexus-docker/api-gateway:${var.container_image_tag}"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : var.environment
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3000
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 3000
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow unauthenticated access - the API gateway handles its own auth
resource "google_cloud_run_v2_service_iam_member" "api_gateway_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api_gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Skill Registry ---
resource "google_cloud_run_v2_service" "skill_registry" {
  name     = "${var.environment}-nexus-skill-registry"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 20
    }

    max_instance_request_concurrency = 40

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.environment}-nexus-docker/skill-registry:${var.skill_registry_image_tag}"

      ports {
        container_port = 3002
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : var.environment
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3002
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 3002
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# --- Orchestrator ---
resource "google_cloud_run_v2_service" "orchestrator" {
  name     = "${var.environment}-nexus-orchestrator"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 50
    }

    max_instance_request_concurrency = 20

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.environment}-nexus-docker/orchestrator:${var.orchestrator_image_tag}"

      ports {
        container_port = 50051
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        grpc {
          port = 50051
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        grpc {
          port = 50051
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# --- LLM Router ---
resource "google_cloud_run_v2_service" "llm_router" {
  name     = "${var.environment}-nexus-llm-router"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    max_instance_request_concurrency = 100

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.environment}-nexus-docker/llm-router:${var.llm_router_image_tag}"

      ports {
        container_port = 3001
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : var.environment
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3001
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 3001
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}
