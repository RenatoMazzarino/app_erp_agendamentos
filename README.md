# Estudio Platform (Android + Backend AWS)

Status: em execucao

## Escopo

1. App Android nativo (`Kotlin + Jetpack Compose`).
2. Backend novo (`TypeScript + Fastify`) em AWS.
3. Banco canônico `Aurora PostgreSQL`.

## Estrutura

1. `app/`: app Android.
2. `backend/`: API backend para app mobile.
3. `infra/terraform/`: provisionamento AWS/Aurora.
4. `docs/`: runbooks e decisoes de execucao.

## Docs operacionais

1. `docs/EXECUCAO_FASE_1_5_E_2_2026-03-20.md`
2. `docs/CLIENTES_PARIDADE_WEB_MOBILE.md`
3. `docs/WORKSPACE_AWS_DB_OPERACAO_2026-03-20.md`

## Comandos Android

```powershell
.\gradlew.bat clean assembleDebug
.\gradlew.bat testDebugUnitTest
.\gradlew.bat lintDebug
```

## Comandos Backend

```powershell
cd backend
pnpm install
pnpm check-types
pnpm test
pnpm build
pnpm dev
```

## Comandos Terraform (exemplo dev)

```powershell
cd infra/terraform
terraform init
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```
