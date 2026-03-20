# Paridade Clientes (Web x Mobile)

Data: 2026-03-20  
Status: fase 2 avançada com CRUD + perfil financeiro/prontuário em execução no app Android.

## Escopo de paridade funcional

1. Login autenticado com sessao persistida.
2. Isolamento por tenant no consumo do modulo clientes.
3. Listagem de clientes com busca.
4. Exibicao dos campos principais do cliente.
5. Fluxo de renovacao de sessao e logout.
6. Observabilidade minima de requests.

## Matriz de status

1. Login Cognito + sessao segura em storage local: **concluido**.
2. Renovacao de token por refresh token: **concluido**.
3. Header de correlacao (`x-correlation-id`) em requests: **concluido**.
4. Lista de clientes com filtro por busca (`q`): **concluido**.
5. Campos exibidos no mobile (`fullName`, `preferredName`, `phone`, `whatsapp`, `email`, `notes`): **concluido**.
6. CRUD completo de clientes no app mobile (novo/editar/remover): **concluído**.
7. Perfil completo do cliente com seções (contato, financeiro, prontuário): **concluído**.
8. Ações rápidas por cliente (ligar, WhatsApp, agendar): **concluído**.
9. Prontuário/evolução/anamnese dentro do módulo clientes: **concluído**.
10. Indicadores financeiros/LTV/fidelidade na tela do cliente: **concluído**.

## Criterio de aceite da fase 2

1. Usuario autentica com credenciais Cognito e entra no app.
2. Sessao permanece entre reinicios do app.
3. Lista de clientes carrega com tenant correto e sem mistura entre tenants.
4. `/health` retorna `database=ok` em ambiente dev AWS.
5. Logs de backend registram `correlationId` para cada request.
6. Endpoint `GET /clients/:id/profile` retorna snapshot de negócio para paridade com web.
7. Endpoint `PUT/DELETE /clients/:id` aplica edição e remoção fim a fim.
