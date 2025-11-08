# Shared Terraform state bucket (bootstrap)
# This allows creating the GCS bucket that will later back Terraform state for cross-repo consumption.

# Enable Cloud Storage API if requested
resource "google_project_service" "storage" {
  count               = var.enable_apis ? 1 : 0
  project             = var.project_id
  service             = "storage.googleapis.com"
  disable_on_destroy  = false
}

# Optionally create the state bucket (run with local backend first, then migrate to GCS backend)
resource "google_storage_bucket" "tfstate" {
  count    = var.create_tfstate_bucket ? 1 : 0
  name     = var.tfstate_bucket_name
  location = "US"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  labels = merge(var.labels, {
    purpose = "terraform-state"
  })

  depends_on = [google_project_service.storage]
}

# Grant the deploy service account permissions to manage objects in the state bucket
# This is required if CI (running as the deploy SA) will read/write Terraform state in GCS.
resource "google_storage_bucket_iam_member" "tfstate_deploy_object_admin" {
  count  = (var.create_tfstate_bucket && var.create_deploy_sa) ? 1 : 0
  bucket = google_storage_bucket.tfstate[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.deploy[0].email}"

  depends_on = [
    google_storage_bucket.tfstate,
    google_service_account.deploy
  ]
}
