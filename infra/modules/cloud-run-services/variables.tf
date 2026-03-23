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

variable "container_image_tag" {
  description = "The container image tag for the API Gateway service"
  type        = string
  default     = "latest"
}

variable "skill_registry_image_tag" {
  description = "The container image tag for the Skill Registry service"
  type        = string
  default     = "latest"
}

variable "orchestrator_image_tag" {
  description = "The container image tag for the Orchestrator service"
  type        = string
  default     = "latest"
}

variable "llm_router_image_tag" {
  description = "The container image tag for the LLM Router service"
  type        = string
  default     = "latest"
}
