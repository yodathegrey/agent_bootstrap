output "api_gateway_url" {
  description = "The URL of the API Gateway Cloud Run service"
  value       = module.cloud_run_services.api_gateway_url
}

output "web_app_url" {
  description = "The URL of the Firebase-hosted web application"
  value       = module.firebase_hosting.web_app_url
}

output "firestore_database_id" {
  description = "The Firestore database ID"
  value       = module.firestore.database_id
}
