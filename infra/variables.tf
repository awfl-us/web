variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Region for Cloud Run and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "domains" {
  description = "Ordered list of domains to map to the SPA service. domains[0] is the apex (e.g., awfl.us), domains[1] the www subdomain."
  type        = list(string)
  default     = ["awfl.us", "www.awfl.us"]
}

variable "labels" {
  description = "Labels to apply to supported resources"
  type        = map(string)
  default     = {
    app   = "awfl-web"
    stack = "cloudrun"
  }
}

variable "service_name" {
  description = "Cloud Run service name for the SPA"
  type        = string
  default     = "awfl-web"
}

variable "image" {
  description = "Container image to deploy (e.g., us-central1-docker.pkg.dev/<project>/<repo>/awfl-web:prod). Leave empty to skip creating Cloud Run resources until an image is available."
  type        = string
  default     = ""
}

variable "min_instances" {
  description = "Minimum instances for Cloud Run (0 to scale to zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances for Cloud Run"
  type        = number
  default     = 5
}

variable "cpu" {
  description = "CPU limit for the container (e.g., '1')"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory limit for the container (e.g., '512Mi')"
  type        = string
  default     = "512Mi"
}

variable "create_artifact_repo" {
  description = "Whether to create an Artifact Registry Docker repository for images"
  type        = bool
  default     = true
}

variable "artifact_repo_id" {
  description = "Artifact Registry repository ID"
  type        = string
  default     = "awfl-web"
}

variable "enable_apis" {
  description = "Whether to enable required Google APIs (run.googleapis.com, artifactregistry.googleapis.com, iam.googleapis.com, storage.googleapis.com)"
  type        = bool
  default     = true
}

variable "create_deploy_sa" {
  description = "Whether to create a deployment service account and grant IAM roles"
  type        = bool
  default     = true
}

variable "deploy_sa_account_id" {
  description = "Account ID (without domain) for the deployment service account"
  type        = string
  default     = "web-deploy"
}

# If you already have a deploy SA, set create_deploy_sa=false and provide its email here to bind WIF to it
variable "deploy_sa_email" {
  description = "Existing deployment service account email (used when create_deploy_sa=false)"
  type        = string
  default     = ""
}

variable "create_tfstate_bucket" {
  description = "Whether to create a GCS bucket for shared Terraform state (bootstrap locally, then migrate backend)"
  type        = bool
  default     = true
}

variable "tfstate_bucket_name" {
  description = "Name of the GCS bucket for Terraform state (must be globally unique)"
  type        = string
  default     = "tfstate-awfl-web"
}

variable "tfstate_prefix" {
  description = "Object prefix (folder) within the state bucket"
  type        = string
  default     = "infra/envs/prod"
}

# -------- WIF (web repo) --------
variable "github_repository" {
  description = "GitHub repository allowed to use OIDC (owner/repo)"
  type        = string
}

variable "wif_pool_id" {
  description = "Workload Identity Pool ID for this repo (must be unique in project)"
  type        = string
  default     = "github-oidc-web"
}

variable "wif_provider_id" {
  description = "Workload Identity Pool Provider ID"
  type        = string
  default     = "github"
}
