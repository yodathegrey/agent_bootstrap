output "database_id" {
  description = "The Firestore database ID"
  value       = google_firestore_database.main.name
}

output "database_name" {
  description = "The fully qualified Firestore database name"
  value       = google_firestore_database.main.id
}
