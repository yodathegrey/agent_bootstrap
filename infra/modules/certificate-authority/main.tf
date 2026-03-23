# --- CA Pool for mTLS Certificates ---
resource "google_privateca_ca_pool" "nexus_mtls_pool" {
  name     = "${var.environment}-nexus-mtls-pool"
  location = var.region
  project  = var.project_id
  tier     = "DEVOPS"

  publishing_options {
    publish_ca_cert = true
    publish_crl     = true
  }

  issuance_policy {
    maximum_lifetime = "86400s" # 24 hours

    baseline_values {
      key_usage {
        base_key_usage {
          digital_signature = true
          key_encipherment  = true
        }
        extended_key_usage {
          client_auth = true
          server_auth = true
        }
      }

      ca_options {
        is_ca = false
      }
    }

    allowed_key_types {
      elliptic_curve {
        signature_algorithm = "ECDSA_P256"
      }
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    platform    = "nexus"
  }
}

# --- Root Certificate Authority for Agent Runtime Certificates ---
resource "google_privateca_certificate_authority" "nexus_agent_runtime_ca" {
  pool                     = google_privateca_ca_pool.nexus_mtls_pool.name
  certificate_authority_id = "${var.environment}-nexus-agent-runtime-ca"
  location                 = var.region
  project                  = var.project_id

  type = "SELF_SIGNED"

  lifetime = "315360000s" # 10 years

  config {
    subject_config {
      subject {
        organization = "Nexus Platform"
        common_name  = "${var.environment}-nexus-agent-runtime-ca"
      }
    }

    x509_config {
      ca_options {
        is_ca                  = true
        max_issuer_path_length = 1
      }

      key_usage {
        base_key_usage {
          cert_sign = true
          crl_sign  = true
        }
        extended_key_usage {
          client_auth = true
          server_auth = true
        }
      }
    }
  }

  key_spec {
    algorithm = "EC_P256_SHA256"
  }

  deletion_protection = var.environment == "prod" ? true : false

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    platform    = "nexus"
  }
}
