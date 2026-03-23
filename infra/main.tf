terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  # backend "gcs" {
  #   bucket = "nexus-terraform-state-${var.environment}"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# --- Firestore ---
module "firestore" {
  source = "./modules/firestore"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

# --- Cloud Run Services ---
module "cloud_run_services" {
  source = "./modules/cloud-run-services"

  project_id          = var.project_id
  region              = var.region
  environment         = var.environment
  container_image_tag = var.container_image_tag
}

# --- Pub/Sub ---
module "pubsub" {
  source = "./modules/pubsub"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

# --- Memorystore (Redis) ---
module "memorystore" {
  source = "./modules/memorystore"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

# --- Secret Manager ---
module "secret_manager" {
  source = "./modules/secret-manager"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

# --- Artifact Registry ---
module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

# --- Firebase Hosting ---
module "firebase_hosting" {
  source = "./modules/firebase-hosting"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

# --- Certificate Authority (mTLS for Agent Runtimes) ---
module "certificate_authority" {
  source = "./modules/certificate-authority"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

# --- Monitoring ---
module "monitoring" {
  source = "./modules/monitoring"

  project_id           = var.project_id
  region               = var.region
  environment          = var.environment
  cloud_run_service_id = module.cloud_run_services.api_gateway_service_id
  redis_instance_id    = module.memorystore.redis_instance_id
  notification_email   = var.notification_email
}
