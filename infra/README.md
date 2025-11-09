Cloud Run hosting for awfl.us SPA (Terraform)

This Terraform config deploys the Vite SPA to Cloud Run (no external load balancer) and maps custom domains (awfl.us, www.awfl.us) directly to the Cloud Run service. DNS is managed in a separate backend repo, which consumes the outputs via terraform_remote_state and creates the required record sets.

What it creates
- Cloud Run (v2) service running nginx that serves the built SPA with SPA fallback (index.html for unknown routes)
- Public access (roles/run.invoker for allUsers)
- Domain mappings for:
  - Apex: awfl.us
  - Subdomain: www.awfl.us (optional)
- Optional Artifact Registry Docker repository
- Optional API enablement (run.googleapis.com, artifactregistry.googleapis.com, iam.googleapis.com, storage.googleapis.com)
- Optional Terraform state bucket (GCS) for shared state across repos
- Workload Identity Federation (WIF) pool/provider for this GitHub repo (optional; controlled by vars)
- A generated GitHub Actions variables file (.github/actions-variables.json) the CI workflow can load

Prereqs
- A GCP project with billing enabled
- Terraform >= 1.5, Google provider >= 7.10

Repo layout (relevant)
- Dockerfile — builds the app and serves dist/ with nginx on port 8080
- nginx.conf — SPA fallback + caching (immutable for /assets, no-cache for /index.html)
- infra/
  - main.tf — Cloud Run service, IAM invoker, domain mappings, optional AR repo
  - iam.tf — deployment service account + IAM bindings
  - wif.tf — WIF pool/provider (for GitHub Actions) and emission of Actions variables file
  - storage.tf — optional GCS bucket for Terraform state
  - backend.tf — hardcoded GCS backend (bucket/prefix) for Terraform remote state
  - variables.tf — inputs (project, region, image, domains, GitHub repo, etc.)
  - outputs.tf — service_url + DNS records + CI variables
  - versions.tf — provider and version constraints
  - dev.auto.tfvars — example variables (image intentionally empty by default)

Bootstrap the shared Terraform state bucket (in this repo)
This repo can create its own GCS bucket for Terraform state so other repos (e.g., DNS/backend) can consume outputs via remote_state.

Important: backend.tf is hardcoded to use the GCS bucket/prefix below. The first time you apply, the bucket will not exist yet. Initialize with the backend disabled to create it, then migrate state.

1) Ensure dev.auto.tfvars has (and keep these in sync with backend.tf):
   create_tfstate_bucket = true
   tfstate_bucket_name   = "tfstate-awfl-web"   # must be globally unique
   tfstate_prefix        = "infra/envs/prod"

2) Initial apply WITHOUT the backend (creates the bucket):
   cd infra
   terraform init -backend=false
   terraform apply -var "project_id=YOUR_PROJECT" -var "region=us-central1"

3) Migrate local state into the hardcoded GCS backend (uses backend.tf):
   terraform init -migrate-state

   # If you ever change the bucket/prefix in backend.tf, run:
   # terraform init -migrate-state

Two-phase (multi-stage) apply
You can apply before an image exists, then complete once the image is built/pushed.

- Phase 1: create APIs/SA/repo/WIF only (no image)
  - dev.auto.tfvars sets image = "" by default. Leave it empty.
  - Optionally set github_repository = "OWNER/REPO" to wire WIF to this repo and emit CI variables.
  - Apply:
    terraform apply -var "project_id=YOUR_PROJECT" -var "region=us-central1" [-var "github_repository=OWNER/REPO"]
  - This creates:
    - Deployment service account + IAM (run.admin, artifactregistry.writer, SA User on default compute SA)
    - Required APIs (if enable_apis=true)
    - Optional Artifact Registry repo (if create_artifact_repo=true)
    - Optional WIF pool/provider for GitHub Actions (if github_repository set)
    - A variables file for CI at .github/actions-variables.json
  - Cloud Run service, public invoker, and domain mappings are skipped until an image is provided.

- Build and push your image (Artifact Registry)
  export PROJECT_ID=YOUR_PROJECT
  export REGION=us-central1
  export REPO=awfl-web
  export IMAGE=awfl-web
  export TAG=prod
  gcloud auth configure-docker ${REGION}-docker.pkg.dev
  docker build -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}" .
  docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}"

- Phase 2: finish Cloud Run + domains
  - Apply with the image set:
    terraform apply \
      -var "project_id=${PROJECT_ID}" \
      -var "region=${REGION}" \
      -var "image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}"
  - Outputs become available:
    - service_url: Google *.run.app URL
    - root_records/www_records: DNS RRsets for the backend DNS repo

Terraform apply (summary)
- First-time bootstrap (no bucket yet):
  terraform init -backend=false
  terraform apply -var "project_id=YOUR_PROJECT" -var "region=us-central1"
  terraform init -migrate-state

- Day 2 and beyond (backend configured via backend.tf):
  terraform init   # only needed after repo checkout or backend changes
  terraform apply -var "project_id=YOUR_PROJECT" -var "region=us-central1" [-var "image=..."] [-var "github_repository=OWNER/REPO"]

Key variables (see variables.tf)
- project_id (string): GCP project ID
- region (string, default us-central1): Cloud Run + AR region
- image (string, default ""): Full image ref to deploy; when empty, Cloud Run + domain mappings are not created
- domains (list(string), default ["awfl.us","www.awfl.us"]): [apex, www]
- enable_apis (bool, default true): Enable required Google APIs
- create_artifact_repo (bool, default true): Create AR repo
- artifact_repo_id (string, default "awfl-web"): AR repo ID
- create_deploy_sa (bool, default true): Create a deployment service account and bind roles
- github_repository (string, optional): OWNER/REPO used for WIF provider and CI variables file
- create_tfstate_bucket (bool, default true): Create a GCS bucket for Terraform state
- tfstate_bucket_name/tfstate_prefix: State bucket settings (must match backend.tf once migrated)

Outputs (consumed by backend DNS repo and CI)
- service_url: Public URL of the Cloud Run service (null until image provided and service created)
- root_records: list of objects { name, type, rrdata } for awfl.us (empty until mapping exists)
- www_records: list of objects { name, type, rrdata } for www.awfl.us (empty until mapping exists)
- deploy_sa_email: Email of the deployment service account (null if not created)
- actions_variables: map of CI variables written to .github/actions-variables.json when github_repository is set

GitHub Actions (CI) for this repo
We now generate a variables file and let the repo’s Deploy workflow consume it. CI does not run Terraform for this web repo.

- Terraform writes .github/actions-variables.json with keys like:
  - PROJECT_ID, REGION
  - ARTIFACT_REPO, IMAGE_NAME
  - GCP_WIF_PROVIDER (resource path for WIF provider)
  - GCP_DEPLOY_SA (deploy service account email)
- The workflow .github/workflows/deploy.yml:
  - Loads env from .github/actions-variables.json if present, else falls back to repository Variables
  - Authenticates via WIF and builds/pushes the image (no terraform apply)

Recommended flow
1) Run Phase 1 apply locally with github_repository set to generate .github/actions-variables.json.
2) Commit .github/actions-variables.json to the repo (or use the optional sync workflow to copy values into repository Variables and then delete the file).
3) Push to main to trigger the Deploy workflow; it will build/push the image.
4) Run Phase 2 apply locally with image set to create/update Cloud Run and domain mappings.

Backend DNS repo: consume via terraform_remote_state
1) Data source for this repo’s state (GCS backend configured via backend.tf):

data "terraform_remote_state" "awfl_web" {
  backend = "gcs"
  config = {
    bucket = "tfstate-awfl-web"
    prefix = "infra/envs/prod"
  }
}

2) Merge and group records by name+type so multi-value RRsets are created correctly:

locals {
  web_all_records = concat(
    try(data.terraform_remote_state.awfl_web.outputs.root_records, []),
    try(data.terraform_remote_state.awfl_web.outputs.www_records, [])
  )

  web_unique_keys = distinct([for r in local.web_all_records : "${r.name}|${r.type}"])

  web_record_groups = {
    for k in local.web_unique_keys :
    k => {
      name    = split("|", k)[0]
      type    = split("|", k)[1]
      rrdatas = [for r in local.web_all_records : r.rrdata if "${r.name}|${r.type}" == k]
    }
  }
}

3) Create record sets in your existing zone (example zone name: awfl_us):

resource "google_dns_record_set" "awfl_web" {
  for_each     = local.web_record_groups
  managed_zone = "awfl_us"

  # Ensure trailing dot on FQDNs (Cloud Run outputs typically include them, but this is safe)
  name    = endswith(each.value.name, ".") ? each.value.name : "${each.value.name}."
  type    = each.value.type
  ttl     = 300
  rrdatas = each.value.rrdatas
}

End-to-end flow
1) Bootstrap: create the GCS state bucket via this repo (storage.tf) and migrate state.
2) Phase 1 apply here with image="" to create SA/APIs/repo/WIF and emit CI variables file.
3) Commit the CI variables file (or sync to repo Variables) and push; Deploy workflow builds/pushes the image.
4) Phase 2 apply here with image set to create Cloud Run + domain mappings.
5) Backend DNS repo applies remote_state outputs to create DNS records.
6) Certificates provision automatically after DNS propagates. Visit https://awfl.us and https://www.awfl.us.

Notes and troubleshooting
- service_url may be null and DNS outputs empty until image is provided and resources are created.
- Domain mapping status may show as Pending until TXT/A/AAAA/CNAME records resolve; use dig to verify.
- If using a custom runtime service account for Cloud Run, also grant roles/iam.serviceAccountUser to the deploy SA on that account.
- dev.auto.tfvars intentionally has image = "" to support the two-phase flow; set when ready.
- If you previously copied a workflow from another repo, retire it and use this repo’s .github/workflows/deploy.yml.

Cleanup
- terraform destroy (this repo)
- Remove DNS records from backend repo and apply
