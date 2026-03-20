# Execucao Fase 1.5 e 2

Status: em execucao com deploy AWS ativo e cobertura completa dos modulos operacionais internos
Data base: 2026-03-20

## Entregas implementadas

1. baseline de infraestrutura AWS + Aurora em Terraform.
2. baseline backend `TypeScript + Fastify` pronto para container.
3. documentacao operacional inicial para backend e Terraform.
4. validacao local Android (`assembleDebug`) no repo novo.
5. backend deployado no ECS com healthcheck em ALB (`/health` = `200`).
6. bootstrap migration aplicado no Aurora via startup da API.
7. autenticacao Cognito adicionada no backend (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`).
8. observabilidade por `x-correlation-id` no backend e cliente mobile.
9. app Android movido para Jetpack Compose com login/sessao/token refresh.
10. modulo Clientes no app Android com CRUD completo e perfil consolidado.
11. backend expandido para perfil completo de cliente:
    - contatos multiplos (phones/emails)
    - enderecos
    - itens de saude
    - snapshot financeiro e prontuario
12. endpoints novos de clientes:
    - `GET /clients/:id/profile`
    - `PUT /clients/:id`
    - `DELETE /clients/:id`
13. backend expandido para modulos restantes do dashboard:
    - bloqueios de agenda (`/schedule-blocks`)
    - admin de membros e auditoria (`/admin/members`, `/admin/audit-events`)
    - menu operacional (`/menu/actions`)
14. backend recebeu operacoes completas dos modulos existentes:
    - agenda: update/delete + status
    - atendimento: update/delete evolucao
    - mensagens: update de status
    - caixa: listagem/atualizacao de pagamentos
    - catalogo: get/update/delete de servicos
15. app Android atualizado com telas e operacoes para:
    - dashboard
    - agenda
    - atendimento
    - clientes
    - mensagens
    - caixa/catalogo
    - bloqueios
    - admin
    - menu
    - configuracoes
16. imagem da API publicada no ECR:
    - `809772106192.dkr.ecr.sa-east-1.amazonaws.com/estudio-platform-dev-api:v20260320-115646-0d14a63-full-modules`
17. Terraform apply em `dev` concluido e servico ECS atualizado.
18. smoke E2E executado no ALB dev cobrindo os modulos acima.

## Validacoes executadas

### Android

1. `.\gradlew.bat :app:assembleDebug` -> `BUILD SUCCESSFUL`.
2. `.\gradlew.bat :app:testDebugUnitTest :app:lintDebug` -> `BUILD SUCCESSFUL`.

### Backend (via Docker)

1. `pnpm install --frozen-lockfile` -> ok.
2. `pnpm check-types` -> ok.
3. `pnpm lint` -> ok.
4. `pnpm test` -> ok.
5. `pnpm build` -> ok.

### Terraform (via Docker)

1. `terraform init -reconfigure -backend-config=backend/dev.hcl` -> ok.
2. `terraform apply -auto-approve -var-file=environments/dev.tfvars` -> ok.

### Rollout e smoke runtime (AWS dev)

1. `aws ecs wait services-stable` no servico `estudio-platform-dev-api`: ok.
2. `GET /health`: `status=ok` e `database=ok`.
3. smoke autenticado validado para:
   - menu/actions
   - clients/services
   - appointments create/update/status/delete
   - attendance evolutions create/update/delete
   - messages create/status
   - finance payments create/list/status
   - schedule-blocks create/list/delete
   - admin members create/update/list + audit-events

Observacao:

1. o uso via Docker foi adotado para nao depender de instalacao local do Terraform no Windows neste momento.

## Itens pendentes para concluir programa completo da reescrita

1. cobertura de testes instrumentados Android por fluxo (ainda sem suites de UI automatizadas).
2. endurecimento de UX visual para aderencia final ao design system oficial.
3. fases de offline/sync, hardening de seguranca e rollout Play Store ainda nao finalizadas.
4. paridade dos fluxos publicos (`agendar`, `pagamento`, `voucher`, `comprovante`) ainda precisa ser fechada no app nativo.

## Proximo passo operacional

1. fechar cobertura de fluxos publicos com contratos mobile-first.
2. implementar testes instrumentados E2E por modulo.
3. seguir para fase de offline/sync e hardening antes de release externa.
