locals {
  secrets = [
    "stripe-secret-key",
    "stripe-webhook-secret",
    "firebase-service-account",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  for_each = toset(local.secrets)

  secret_id = "${var.environment}-nexus-${each.value}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
