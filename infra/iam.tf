# Deployment service account and IAM bindings

# Enable IAM APIs if requested
resource "google_project_service" "iam" {
  count              = var.enable_apis ? 1 : 0
  project            = var.project_id
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iamcredentials" {
  count              = var.enable_apis ? 1 : 0
  project            = var.project_id
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

# Optionally create a dedicated deployment service account used by CI/CD
resource "google_service_account" "deploy" {
  count        = var.create_deploy_sa ? 1 : 0
  project      = var.project_id
  account_id   = var.deploy_sa_account_id
  display_name = "Web Deploy"
  depends_on   = [google_project_service.iam]
}

# Project-level roles required for deploying Cloud Run and pushing images
resource "google_project_iam_member" "deploy_run_admin" {
  count   = var.create_deploy_sa ? 1 : 0
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deploy[0].email}"
}

resource "google_project_iam_member" "deploy_artifact_writer" {
  count   = var.create_deploy_sa ? 1 : 0
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deploy[0].email}"
}

# Allow the deploy SA to act as the runtime service account used by Cloud Run (default compute SA by default)
# This grants Service Account User on the default compute SA to the deploy SA.
data "google_project" "current" {
  project_id = var.project_id
}

locals {
  default_compute_sa_email = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_service_account_iam_member" "deploy_can_use_runtime_sa" {
  count              = var.create_deploy_sa ? 1 : 0
  service_account_id = "projects/${var.project_id}/serviceAccounts/${local.default_compute_sa_email}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy[0].email}"
}