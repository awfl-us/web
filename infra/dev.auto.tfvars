# Auto-loaded defaults for local/dev applies
# Update project_id before running terraform apply.

project_id = "awfl-us"
region     = "us-central1"

github_repository = "awfl-us/web"

# Service name for Cloud Run (override if you prefer a dev-specific name)
service_name = "awfl-web"

# Full image reference pushed to Artifact Registry
# Example: us-central1-docker.pkg.dev/<project>/<repo>/<image>:<tag>
# image = "us-central1-docker.pkg.dev/awfl-us/awfl-web/awfl-web:latest"
image = ""

# Domain mappings. Maintain order: [apex, www]
# If you are not mapping custom domains in dev, you can set this to [] or omit.
domains = [
  "awfl.us",
  "www.awfl.us",
]

# Resource and scaling defaults
min_instances = 0
max_instances = 3
cpu           = "1"
memory        = "512Mi"

# Labels applied to supported resources
labels = {
  app   = "awfl-web"
  env   = "dev"
  stack = "cloudrun"
}

# Optional helpers
enable_apis          = true
create_artifact_repo = true
artifact_repo_id     = "awfl-web"

# Terraform state bucket (created by this module in bootstrap phase)
create_tfstate_bucket = true
tfstate_bucket_name   = "tfstate-awfl-web"
tfstate_prefix        = "infra/envs/prod"
