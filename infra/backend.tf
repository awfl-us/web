terraform {
  backend "gcs" {
    # Hardcoded remote state location for the web repo
    # NOTE: Ensure this bucket exists (infra/storage.tf can create it on first apply with local backend),
    # then run `terraform init -migrate-state` to move local state into GCS.
    bucket = "tfstate-awfl-web"
    prefix = "infra/envs/prod"
  }
}
