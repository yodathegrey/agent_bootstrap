# --- Notification Channel ---
resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "Nexus ${var.environment} Ops Email"
  type         = "email"

  labels = {
    email_address = var.notification_email
  }

  force_delete = false
}

# --- Cloud Run Error Rate Alert ---
resource "google_monitoring_alert_policy" "cloud_run_error_rate" {
  project      = var.project_id
  display_name = "${var.environment}-nexus-cloud-run-error-rate"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run 5xx Error Rate"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "${var.environment}-nexus-api-gateway"
        AND metric.type = "run.googleapis.com/request_count"
        AND metric.labels.response_code_class = "5xx"
      EOT

      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 10

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  user_labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# --- Redis Memory Usage Alert ---
resource "google_monitoring_alert_policy" "redis_memory_usage" {
  project      = var.project_id
  display_name = "${var.environment}-nexus-redis-memory-usage"
  combiner     = "OR"

  conditions {
    display_name = "Redis Memory Usage > 80%"

    condition_threshold {
      filter = <<-EOT
        resource.type = "redis_instance"
        AND resource.labels.instance_id = "${var.environment}-nexus-redis"
        AND metric.type = "redis.googleapis.com/stats/memory/usage_ratio"
      EOT

      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  user_labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
