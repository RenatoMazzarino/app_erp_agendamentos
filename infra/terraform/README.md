# Infra Terraform (AWS + Aurora)

## Pre-requisitos

1. Terraform >= 1.8 (ou `hashicorp/terraform` via Docker).
2. AWS CLI autenticado no perfil alvo.
3. Permissoes para VPC, ECS, RDS, Cognito, S3, SQS, EventBridge e IAM.

## Backend remoto por ambiente

1. `backend/dev.hcl`
2. `backend/preview.hcl`
3. `backend/prod.hcl`

## Como usar (dev)

```powershell
cd infra/terraform
$env:AWS_PROFILE="estudio_prod_admin"
terraform init -reconfigure -backend-config="backend/dev.hcl"
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

## Segredos

1. Definir credenciais sensiveis via variavel de ambiente:
   - `TF_VAR_db_master_username`
   - `TF_VAR_db_master_password`
2. Nao hardcode em `.tfvars` versionado.
3. Em producao, manter segredos no AWS Secrets Manager/CI secret store.

## Observacoes

1. Este baseline cria Aurora PostgreSQL serverless v2 (writer + reader).
2. HTTPS/ACM/WAF entram no hardening da proxima etapa.
