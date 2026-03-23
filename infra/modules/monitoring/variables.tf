variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}

variable "cloud_run_service_id" {
  description = "The Cloud Run service ID for monitoring"
  type        = string
}

variable "redis_instance_id" {
  description = "The Redis instance ID for monitoring"
  type        = string
}

variable "notification_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = "ops@nexus.dev"
}

variable "alert_email" {
  description = "Email address for alert policy notifications"
  type        = string
  default     = "ops@nexus.dev"
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances (used for scaling limit alert)"
  type        = number
  default     = 100
}
