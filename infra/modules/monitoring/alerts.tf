###############################################################################
# Notification channel (shared by all alert policies)
###############################################################################

resource "google_monitoring_notification_channel" "email" {
  display_name = "Nexus Ops Team Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

###############################################################################
# Alert: API Gateway 5xx rate > 10/min for 5 min
###############################################################################

resource "google_monitoring_alert_policy" "api_gateway_5xx" {
  display_name = "API Gateway 5xx Rate > 10/min"
  combiner     = "OR"

  conditions {
    display_name = "5xx error rate exceeds threshold"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "API Gateway is returning more than 10 5xx errors per minute. Check Cloud Run logs for api-gateway service."
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

###############################################################################
# Alert: API Gateway p99 latency > 3s for 5 min
###############################################################################

resource "google_monitoring_alert_policy" "api_gateway_latency" {
  display_name = "API Gateway p99 Latency > 3s"
  combiner     = "OR"

  conditions {
    display_name = "p99 latency exceeds 3 seconds"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/request_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3000
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        cross_series_reducer = "REDUCE_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "API Gateway p99 latency has exceeded 3 seconds for 5 minutes. Check for downstream service degradation or resource exhaustion."
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

###############################################################################
# Alert: Orchestrator error rate > 5% for 5 min
###############################################################################

resource "google_monitoring_alert_policy" "orchestrator_error_rate" {
  display_name = "Orchestrator Error Rate > 5%"
  combiner     = "OR"

  conditions {
    display_name = "Orchestrator error rate exceeds 5%"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orchestrator\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "Orchestrator error rate has exceeded 5% for 5 minutes. Check session processing and downstream LLM calls."
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

###############################################################################
# Alert: Redis memory > 90% for 10 min
###############################################################################

resource "google_monitoring_alert_policy" "redis_memory" {
  display_name = "Redis Memory Usage > 90%"
  combiner     = "OR"

  conditions {
    display_name = "Redis memory usage exceeds 90%"

    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.9
      duration        = "600s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "Redis memory usage has exceeded 90% for 10 minutes. Consider scaling the instance or reviewing key expiration policies."
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

###############################################################################
# Alert: Stripe webhook failures > 5 in 10 min
###############################################################################

resource "google_monitoring_alert_policy" "stripe_webhook_failures" {
  display_name = "Stripe Webhook Failures > 5 in 10min"
  combiner     = "OR"

  conditions {
    display_name = "Stripe webhook failure count exceeds threshold"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"billing\" AND metric.type=\"custom.googleapis.com/billing/stripe_webhook_failures\""
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "600s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "More than 5 Stripe webhook failures in the last 10 minutes. Check billing service logs and Stripe dashboard for event delivery issues."
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

###############################################################################
# Alert: Cloud Run instance count at max for 10 min (scaling limit)
###############################################################################

resource "google_monitoring_alert_policy" "cloud_run_scaling_limit" {
  display_name = "Cloud Run Instances at Max Scaling Limit"
  combiner     = "OR"

  conditions {
    display_name = "Instance count at maximum for 10 minutes"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/container/instance_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.cloud_run_max_instances - 1
      duration        = "600s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MAX"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.labels.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "A Cloud Run service has been running at max instance count for 10 minutes. This may indicate the service needs a higher scaling limit or there is a traffic spike."
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}
