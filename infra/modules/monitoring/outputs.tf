output "notification_channel_id" {
  description = "The monitoring notification channel ID"
  value       = google_monitoring_notification_channel.email.name
}

output "cloud_run_error_rate_alert_id" {
  description = "The Cloud Run error rate alert policy ID"
  value       = google_monitoring_alert_policy.cloud_run_error_rate.name
}

output "redis_memory_usage_alert_id" {
  description = "The Redis memory usage alert policy ID"
  value       = google_monitoring_alert_policy.redis_memory_usage.name
}
