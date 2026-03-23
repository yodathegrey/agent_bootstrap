locals {
  topics = ["agent-events", "usage-events", "memory-events"]
}

# --- Dead Letter Topic ---
resource "google_pubsub_topic" "dead_letter" {
  name    = "${var.environment}-nexus-dead-letter"
  project = var.project_id

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  message_retention_duration = "604800s" # 7 days
}

resource "google_pubsub_subscription" "dead_letter" {
  name    = "${var.environment}-nexus-dead-letter-sub"
  topic   = google_pubsub_topic.dead_letter.id
  project = var.project_id

  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = true
  ack_deadline_seconds       = 60

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- Event Topics ---
resource "google_pubsub_topic" "events" {
  for_each = toset(local.topics)

  name    = "${var.environment}-nexus-${each.value}"
  project = var.project_id

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  message_retention_duration = "86400s" # 24 hours
}

# --- Event Subscriptions ---
resource "google_pubsub_subscription" "events" {
  for_each = toset(local.topics)

  name    = "${var.environment}-nexus-${each.value}-sub"
  topic   = google_pubsub_topic.events[each.value].id
  project = var.project_id

  ack_deadline_seconds       = 30
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false

  expiration_policy {
    ttl = "" # never expires
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 10
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
