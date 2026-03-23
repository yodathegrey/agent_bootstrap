output "docker_repository_id" {
  description = "The ID of the Docker Artifact Registry repository"
  value       = google_artifact_registry_repository.docker.id
}

output "docker_repository_url" {
  description = "The URL of the Docker Artifact Registry repository"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "npm_repository_id" {
  description = "The ID of the npm Artifact Registry repository"
  value       = google_artifact_registry_repository.npm.id
}

output "npm_repository_url" {
  description = "The URL of the npm Artifact Registry repository"
  value       = "https://${var.region}-npm.pkg.dev/${var.project_id}/${google_artifact_registry_repository.npm.repository_id}/"
}
