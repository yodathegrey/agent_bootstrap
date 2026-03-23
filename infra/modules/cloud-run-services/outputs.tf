output "api_gateway_url" {
  description = "The URL of the API Gateway Cloud Run service"
  value       = google_cloud_run_v2_service.api_gateway.uri
}

output "api_gateway_service_id" {
  description = "The fully qualified ID of the API Gateway Cloud Run service"
  value       = google_cloud_run_v2_service.api_gateway.id
}

output "api_gateway_service_name" {
  description = "The name of the API Gateway Cloud Run service"
  value       = google_cloud_run_v2_service.api_gateway.name
}
