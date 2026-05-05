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

output "note" {
  value = "Use AWS CLI samples from README for RDS + Lambda + EventBridge, or expand this module."
}
