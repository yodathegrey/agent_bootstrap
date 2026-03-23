resource "google_firestore_database" "main" {
  provider    = google-beta
  project     = var.project_id
  name        = "${var.environment}-nexus-db"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  concurrency_mode            = "PESSIMISTIC"
  app_engine_integration_mode = "DISABLED"

  delete_protection_state = var.environment == "prod" ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
}

# Index: agents by organization, ordered by creation time
resource "google_firestore_index" "agents_by_org" {
  provider   = google-beta
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "agents"

  fields {
    field_path = "orgId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# Index: audit logs by timestamp
resource "google_firestore_index" "audit_by_timestamp" {
  provider   = google-beta
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "auditLogs"

  fields {
    field_path = "orgId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }
}

# Index: agents by org and status
resource "google_firestore_index" "agents_by_org_status" {
  provider   = google-beta
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "agents"

  fields {
    field_path = "orgId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}
