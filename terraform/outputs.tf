output "cloudflare_worker_url" {
  description = "The URL of the deployed Cloudflare Worker"
  value       = cloudflare_worker_script.nceahelpworker.id
}
