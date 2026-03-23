# Docker repository for container images
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  project       = var.project_id
  repository_id = "${var.environment}-nexus-docker"
  description   = "Nexus ${var.environment} Docker container images"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# npm repository for skill packages
resource "google_artifact_registry_repository" "npm" {
  location      = var.region
  project       = var.project_id
  repository_id = "${var.environment}-nexus-npm"
  description   = "Nexus ${var.environment} npm skill packages"
  format        = "NPM"

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
