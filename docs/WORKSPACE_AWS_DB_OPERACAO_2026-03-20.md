# Operacao Workspace + AWS DB (Repo Android)

Status: active  
Ultima revisao: 2026-03-20

## Objetivo

Definir o padrao de trabalho do repo `estudio-platform` quando usado junto com o
repo web no mesmo VS Code, incluindo banco Aurora, extensoes e ferramentas.

## Uso com workspace de dois repos

Workspace recomendado:

- `C:\Users\renat\Projetos_Dev\estudio-mobile-web.code-workspace`

Este workspace mantem isolamento de lint e Deno para evitar falso positivo entre
web e app.

## Plano unificado entre os dois repos

Para evitar drift da documentacao principal da reescrita, os arquivos abaixo
ficam espelhados por hardlink entre os repos:

1. `docs/plans/PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md`
2. `docs/plans/ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md`

Resultado pratico:

1. editou em um repo, reflete no outro automaticamente;
2. apos `checkout/merge/rebase`, hook local reaplica o hardlink.

Script usado neste repo:

```powershell
.\scripts\dev\sync-shared-plan-links.ps1
```

## Ferramentas e papeis

1. VS Code:
   - codificacao Android/backend/Terraform;
   - Git, PR, run de scripts;
   - SQL via extensao PostgreSQL.
2. Android Studio:
   - emulador;
   - SDK Manager;
   - debug Android nativo/performance;
   - assinatura e release.

## Banco AWS (Aurora) no dia a dia

Forma segura para cliente SQL local:

1. abrir tunel SSM:

```powershell
cd C:\Users\renat\Projetos_Dev\estudio-platform
.\scripts\db\start-aurora-ssm-tunnel.ps1
```

2. manter a janela do tunel aberta;
3. conectar pelo profile `Aurora Dev via SSM` na extensao PostgreSQL.
4. para o profile Aurora via tunel local, usar `sslmode=disable`.

Observacao operacional:

1. a credencial local pode ser mantida em `%APPDATA%\postgresql\pgpass.conf`
   para reduzir prompts de senha.

Pre-requisito:

1. `Session Manager Plugin` instalado no Windows:
   <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html>
2. fallback sem admin:
   - usar binario em `C:\Users\renat\tools\session-manager-plugin\package\bin`;
   - o script `start-aurora-ssm-tunnel.ps1` ja considera esse caminho.

## Console web para consultar tabelas

1. RDS Databases:
   <https://sa-east-1.console.aws.amazon.com/rds/home?region=sa-east-1#databases:>
2. Query Editor v2:
   <https://sa-east-1.console.aws.amazon.com/rds/home?region=sa-east-1#query-editor:>

## Sobre o login da extensao HCP Terraform

Este repo usa Terraform CLI com backend AWS (S3 + DynamoDB lock).

Entao:

1. login da extensao HCP Terraform e opcional;
2. nao bloqueia plan/apply deste projeto.

Troubleshooting:

1. mensagem `There are no open Terraform files`:
   - nao e falha;
   - abra `infra/terraform/main.tf` para a extensao carregar providers/modules.

## Docker local

Nao precisa manter Docker local ligado para desenvolver app Android/backend AWS.

Ligue Docker apenas quando houver trabalho no Supabase local do repo web.

## Timeout na extensao PostgreSQL (Aurora)

Se ocorrer `connection timeout expired`:

1. confirmar autenticacao AWS:
   - `aws sts get-caller-identity --profile estudio_prod_admin`
2. abrir tunel SSM:
   - `.\scripts\db\start-aurora-ssm-tunnel.ps1`
3. manter a janela do tunel aberta;
4. conectar no profile `Aurora Dev via SSM`.

## Regra de atualizacao

Mudou setup de workspace, extensao, banco ou script de acesso?

1. atualizar este documento no mesmo PR da mudanca;
2. atualizar o runbook espelho no repo web quando houver impacto cruzado.
