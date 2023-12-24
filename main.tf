provider "cloudflare" {}

variable "zone_id" {
  default = "082667e246d009e41d59858e44bbe0c5"
}

resource "cloudflare_worker_script" "main_script" {
  zone = "${var.zone}"
  content = "${file("src/server.ts")}"
}

resource "cloudflare_worker_domain" "custom_domain" {
  account_id = ""
  hostname   = "discord.worker.nceahelp.com"
  service    = "my-service"
  zone_id    = "${var.zone_id}"
}
