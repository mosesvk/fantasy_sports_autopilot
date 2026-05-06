# Terraform scaffold — extend with RDS, Lambda, EventBridge, IAM as needed.
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "rds_db_instance_identifier" {
  type        = string
  default     = "lineup-os"
  description = "RDS DB instance identifier for the LineupOS environment."
}

output "note" {
  value = "Use AWS CLI samples from README for RDS + Lambda + EventBridge, or expand this module. Current RDS DB instance identifier: ${var.rds_db_instance_identifier}."
}
