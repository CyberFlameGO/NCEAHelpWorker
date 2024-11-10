variable "cloudflare_account_id" {
  description = "The Cloudflare account ID"
  type        = string
}

variable "cloudflare_api_token" {
  description = "The Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "discord_token" {
  description = "The Discord API token"
  type        = string
  sensitive   = true
}

variable "discord_public_key" {
  description = "The Discord public key"
  type        = string
  sensitive   = true
}

variable "discord_application_id" {
  description = "The Discord application ID"
  type        = string
  sensitive   = true
}

variable "discord_client_secret" {
  description = "The Discord client secret"
  type        = string
  sensitive   = true
}

variable "worker_url" {
  description = "The URL of the worker"
  type        = string
}

variable "cookie_secret" {
  description = "The secret for signing cookies"
  type        = string
  sensitive   = true
}
