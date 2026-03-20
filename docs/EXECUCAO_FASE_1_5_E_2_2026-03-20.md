# Execucao Fase 1.5 e 2

Status: concluido no baseline tecnico  
Data base: 2026-03-20

## Entregas implementadas

1. baseline de infraestrutura AWS + Aurora em Terraform.
2. baseline backend `TypeScript + Fastify` pronto para container.
3. documentacao operacional inicial para backend e Terraform.
4. validacao local Android (`assembleDebug`) no repo novo.

## Validacoes executadas

### Android

1. `.\gradlew.bat :app:assembleDebug` -> `BUILD SUCCESSFUL`.

### Backend

1. `pnpm install` -> ok.
2. `pnpm check-types` -> ok.
3. `pnpm lint` -> ok.
4. `pnpm test` -> ok.
5. `pnpm build` -> ok.

### Terraform (via Docker)

1. `terraform fmt -recursive` -> aplicado.
2. `terraform fmt -check -recursive` -> ok.
3. `terraform init -backend=false` -> ok.
4. `terraform validate` -> ok.

Observacao:

1. o uso via Docker foi adotado para nao depender de instalacao local do
   Terraform no Windows neste momento.

## Itens pendentes para avancar alem do baseline

1. credenciais AWS com permissao de provisionamento real.
2. segredo real de banco (`db_master_password`) por ambiente.
3. execucao de `terraform plan/apply` em `dev`.

## Proximo passo operacional

1. executar `terraform plan` com variaveis reais em `environments/dev.tfvars`.
2. aplicar infraestrutura `dev` e validar healthcheck de API no ALB.
3. conectar backend ao Aurora provisionado e abrir primeira rota de dominio.
