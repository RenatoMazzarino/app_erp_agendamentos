param(
  [string]$Profile = "estudio_prod_admin",
  [string]$Region = "sa-east-1",
  [string]$TerraformDir = "C:\Users\renat\Projetos_Dev\estudio-platform\infra\terraform",
  [int]$LocalPort = 15432,
  [int]$RemotePort = 5432
)

$ErrorActionPreference = "Stop"

Write-Host "Abrindo tunel seguro para Aurora via SSM..."

# Garante que o Session Manager Plugin esteja disponivel no PATH.
$sessionManagerPlugin = Get-Command "session-manager-plugin" -ErrorAction SilentlyContinue
if (-not $sessionManagerPlugin) {
  $candidateDirs = @(
    "$env:ProgramFiles\Amazon\SessionManagerPlugin\bin",
    "$env:ProgramFiles\sessionmanagerplugin\bin",
    "$HOME\tools\session-manager-plugin\package\bin"
  )

  foreach ($dir in $candidateDirs) {
    if (Test-Path $dir) {
      $env:Path = "$dir;$env:Path"
    }
  }

  $sessionManagerPlugin = Get-Command "session-manager-plugin" -ErrorAction SilentlyContinue
}

if (-not $sessionManagerPlugin) {
  throw "Session Manager Plugin nao encontrado. Instale em https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
}

$bastionId = (
  aws ssm describe-instance-information `
    --region $Region `
    --profile $Profile `
    --query "InstanceInformationList[?contains(ComputerName,'bastion') || contains(InstanceId,'i-')].[InstanceId]" `
    --output text
).Trim()

if (-not $bastionId) {
  throw "Nao foi possivel localizar a instancia bastion no SSM."
}

$dbHost = (
  aws rds describe-db-clusters `
    --region $Region `
    --profile $Profile `
    --query "DBClusters[?contains(DBClusterIdentifier,'dev-aurora')].Endpoint" `
    --output text
).Trim()

if (-not $dbHost) {
  throw "Nao foi possivel localizar o endpoint do cluster Aurora dev."
}

Write-Host "Bastion: $bastionId"
Write-Host "Aurora:  ${dbHost}:$RemotePort"
Write-Host "Local:   127.0.0.1:$LocalPort"
Write-Host ""
Write-Host "Mantenha esta janela aberta enquanto usa o cliente SQL."

aws ssm start-session `
  --region $Region `
  --profile $Profile `
  --target $bastionId `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters host="$dbHost",portNumber="$RemotePort",localPortNumber="$LocalPort"
