output "ca_pool_id" {
  description = "The ID of the CA pool for mTLS certificates"
  value       = google_privateca_ca_pool.nexus_mtls_pool.id
}

output "ca_pool_name" {
  description = "The name of the CA pool for mTLS certificates"
  value       = google_privateca_ca_pool.nexus_mtls_pool.name
}

output "agent_runtime_ca_id" {
  description = "The ID of the agent runtime Certificate Authority"
  value       = google_privateca_certificate_authority.nexus_agent_runtime_ca.id
}

output "agent_runtime_ca_name" {
  description = "The name of the agent runtime Certificate Authority"
  value       = google_privateca_certificate_authority.nexus_agent_runtime_ca.certificate_authority_id
}
