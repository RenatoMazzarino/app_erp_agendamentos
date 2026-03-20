project_name = "estudio-platform"
environment  = "dev"
aws_region   = "sa-east-1"
dr_region    = "us-east-1"
vpc_cidr     = "10.40.0.0/16"
db_name      = "estudioplatform"
# definir via tfvars local nao versionado ou variavel de ambiente TF_VAR_db_master_password
container_image = "public.ecr.aws/docker/library/nginx:latest"
