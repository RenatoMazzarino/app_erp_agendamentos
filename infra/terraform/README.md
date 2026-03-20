# Infra Terraform (AWS + Aurora)

## Pré-requisitos

1. Terraform >= 1.8.
2. AWS CLI autenticado no perfil alvo.
3. Permissões para VPC, ECS, RDS, Cognito, S3, SQS, EventBridge e IAM.

## Como usar

```powershell
cd infra/terraform
terraform init
terraform plan -var-file="environments/dev.tfvars" -var "db_master_username=platform_admin" -var "db_master_password=SEU_SEGREDO"
terraform apply -var-file="environments/dev.tfvars" -var "db_master_username=platform_admin" -var "db_master_password=SEU_SEGREDO"
```

## Observações

1. Este baseline já cria Aurora PostgreSQL serverless v2 (writer + reader).
2. Em produção, usar segredo por `TF_VAR_db_master_password` ou secret store de CI.
3. HTTPS/ACM/WAF entram no hardening da próxima etapa.
