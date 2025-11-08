locals {
  name_prefix = "awfl-web"
}

# Optionally enable required Google APIs
resource "google_project_service" "apis" {
  count               = var.enable_apis ? 1 : 0
  project             = var.project_id
  service             = "run.googleapis.com"
  disable_on_destroy  = false
}

resource "google_project_service" "artifactregistry" {
  count               = var.enable_apis ? 1 : 0
  project             = var.project_id
  service             = "artifactregistry.googleapis.com"
  disable_on_destroy  = false
}

# Optional: Artifact Registry repository to store the SPA image
resource "google_artifact_registry_repository" "repo" {
  count         = var.create_artifact_repo ? 1 : 0
  location      = var.region
  repository_id = var.artifact_repo_id
  description   = "Container images for awfl.us SPA"
  format        = "DOCKER"
  labels        = var.labels
  depends_on    = [google_project_service.artifactregistry]
}

# Cloud Run (v2) service that serves the built Vite SPA via nginx
# Creation is gated on image being provided to support a two-phase apply
resource "google_cloud_run_v2_service" "spa" {
  count    = var.image != "" ? 1 : 0
  name     = var.service_name
  location = var.region

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"

  labels = var.labels

  depends_on = [google_project_service.apis]
}

# Permit unauthenticated access (public HTTPS)
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.image != "" ? 1 : 0
  project  = google_cloud_run_v2_service.spa[0].project
  location = google_cloud_run_v2_service.spa[0].location
  name     = google_cloud_run_v2_service.spa[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Custom domains → Cloud Run service (no load balancer)
# Apex domain: awfl.us
resource "google_cloud_run_domain_mapping" "root" {
  count    = var.image != "" ? 1 : 0
  location = var.region
  name     = var.domains[0]

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.spa[0].name
  }

  depends_on = [google_cloud_run_v2_service.spa]
}

# www subdomain
resource "google_cloud_run_domain_mapping" "www" {
  count    = (var.image != "" && length(var.domains) > 1) ? 1 : 0
  location = var.region
  name     = var.domains[1]

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.spa[0].name
  }

  depends_on = [google_cloud_run_v2_service.spa]
}
