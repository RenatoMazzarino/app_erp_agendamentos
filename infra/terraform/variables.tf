variable "project_name" {
  type        = string
  description = "Nome base do projeto"
  default     = "estudio-platform"
}

variable "environment" {
  type        = string
  description = "Ambiente (dev|preview|prod)"
}

variable "aws_region" {
  type        = string
  description = "Regiao AWS primaria"
  default     = "sa-east-1"
}

variable "dr_region" {
  type        = string
  description = "Regiao AWS secundaria para continuidade"
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR da VPC"
  default     = "10.40.0.0/16"
}

variable "db_name" {
  type        = string
  description = "Database name inicial"
  default     = "estudioplatform"
}

variable "db_master_username" {
  type        = string
  description = "Usuario master Aurora"
}

variable "db_master_password" {
  type        = string
  description = "Senha master Aurora"
  sensitive   = true
}

variable "container_image" {
  type        = string
  description = "Imagem da API backend"
  default     = "public.ecr.aws/docker/library/nginx:latest"
}
