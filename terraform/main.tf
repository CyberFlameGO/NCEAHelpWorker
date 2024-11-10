terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_worker_script" "nceahelpworker" {
  name = "nceahelpworker"
  content = file("src/server.ts")
  type = "javascript"
}

resource "cloudflare_kv_namespace" "token_store" {
  title = "TOKEN_STORE"
}

resource "cloudflare_worker_secret" "discord_token" {
  script = cloudflare_worker_script.nceahelpworker.name
  name   = "DISCORD_TOKEN"
  value  = var.discord_token
}

resource "cloudflare_worker_secret" "discord_public_key" {
  script = cloudflare_worker_script.nceahelpworker.name
  name   = "DISCORD_PUBLIC_KEY"
  value  = var.discord_public_key
}

resource "cloudflare_worker_secret" "discord_application_id" {
  script = cloudflare_worker_script.nceahelpworker.name
  name   = "DISCORD_APPLICATION_ID"
  value  = var.discord_application_id
}

resource "cloudflare_worker_secret" "discord_client_secret" {
  script = cloudflare_worker_script.nceahelpworker.name
  name   = "DISCORD_CLIENT_SECRET"
  value  = var.discord_client_secret
}

resource "cloudflare_worker_secret" "worker_url" {
  script = cloudflare_worker_script.nceahelpworker.name
  name   = "WORKER_URL"
  value  = var.worker_url
}

resource "cloudflare_worker_secret" "cookie_secret" {
  script = cloudflare_worker_script.nceahelpworker.name
  name   = "COOKIE_SECRET"
  value  = var.cookie_secret
}
