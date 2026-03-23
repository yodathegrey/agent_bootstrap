# Firebase Web App resource
# Note: Firebase Hosting site configuration (rewrites, headers, etc.)
# is managed via firebase.json, not Terraform directly.
# Terraform manages the Firebase project-level web app registration.

resource "google_firebase_web_app" "web" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Nexus ${var.environment} Web App"

  deletion_policy = var.environment == "prod" ? "DELETE" : "DELETE"
}

data "google_firebase_web_app_config" "web" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.web.app_id
}
