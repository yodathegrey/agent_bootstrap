variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resource deployment"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "The deployment environment (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "org_name" {
  description = "The organization name used in resource naming"
  type        = string
  default     = "nexus"
}

variable "container_image_tag" {
  description = "The container image tag for Cloud Run services"
  type        = string
  default     = "latest"
}

variable "notification_email" {
  description = "Email address for monitoring alert notifications"
  type        = string
  default     = "ops@nexus.dev"
}
