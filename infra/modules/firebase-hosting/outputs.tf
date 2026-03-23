output "web_app_id" {
  description = "The Firebase Web App ID"
  value       = google_firebase_web_app.web.app_id
}

output "web_app_url" {
  description = "The default Firebase Hosting URL"
  value       = "https://${var.project_id}.web.app"
}

output "web_app_config" {
  description = "The Firebase Web App configuration"
  value = {
    api_key             = data.google_firebase_web_app_config.web.api_key
    auth_domain         = data.google_firebase_web_app_config.web.auth_domain
    storage_bucket      = data.google_firebase_web_app_config.web.storage_bucket
    messaging_sender_id = data.google_firebase_web_app_config.web.messaging_sender_id
  }
  sensitive = true
}
