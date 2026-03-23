resource "google_redis_instance" "cache" {
  name           = "${var.environment}-nexus-redis"
  project        = var.project_id
  region         = var.region
  tier           = "BASIC"
  memory_size_gb = 1

  redis_version = "REDIS_7_0"
  display_name  = "Nexus ${var.environment} Redis Cache"

  transit_encryption_mode = "SERVER_AUTHENTICATION"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
