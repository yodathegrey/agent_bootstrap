output "redis_instance_id" {
  description = "The fully qualified ID of the Redis instance"
  value       = google_redis_instance.cache.id
}

output "redis_host" {
  description = "The IP address of the Redis instance"
  value       = google_redis_instance.cache.host
}

output "redis_port" {
  description = "The port of the Redis instance"
  value       = google_redis_instance.cache.port
}

output "redis_connection_string" {
  description = "The connection string for the Redis instance"
  value       = "${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}
