output "topic_ids" {
  description = "Map of topic names to their IDs"
  value       = { for k, v in google_pubsub_topic.events : k => v.id }
}

output "subscription_ids" {
  description = "Map of subscription names to their IDs"
  value       = { for k, v in google_pubsub_subscription.events : k => v.id }
}

output "dead_letter_topic_id" {
  description = "The dead letter topic ID"
  value       = google_pubsub_topic.dead_letter.id
}
