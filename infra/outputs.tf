# Outputs for downstream consumers (DNS repo) and CI wiring

# Cloud Run service URL (null until created)
output "service_url" {
  description = "Public URL of the Cloud Run service (null until image is set and service is created)"
  value       = try(google_cloud_run_v2_service.spa[0].uri, null)
}

# DNS records for apex domain (awfl.us) — empty until domain mapping exists
output "root_records" {
  description = "List of DNS RRsets for the apex domain mapping (name, type, rrdata)"
  value = try([
    for rr in google_cloud_run_domain_mapping.root[0].status[0].resource_records : {
      name   = rr.name
      type   = rr.type
      rrdata = rr.rrdata
    }
  ], [])
}

# DNS records for www subdomain — empty until domain mapping exists
output "www_records" {
  description = "List of DNS RRsets for the www domain mapping (name, type, rrdata)"
  value = try([
    for rr in google_cloud_run_domain_mapping.www[0].status[0].resource_records : {
      name   = rr.name
      type   = rr.type
      rrdata = rr.rrdata
    }
  ], [])
}

# Deploy service account email (null if not created and not provided)
output "deploy_sa_email" {
  description = "Email of the deployment service account"
  value       = var.create_deploy_sa ? google_service_account.deploy[0].email : (var.deploy_sa_email != "" ? var.deploy_sa_email : null)
}
