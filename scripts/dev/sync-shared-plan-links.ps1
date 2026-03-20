param(
  [string]$AppRepoPath = "C:\Users\renat\Projetos_Dev\estudio-platform",
  [string]$WebRepoPath = "C:\Users\renat\Projetos_Dev\estudio-corpo-alma-humanizado"
)

$ErrorActionPreference = "Stop"

function Sync-HardlinkFile {
  param(
    [string]$SourcePath,
    [string]$TargetPath
  )

  if (-not (Test-Path $SourcePath)) {
    throw "Arquivo fonte nao encontrado: $SourcePath"
  }

  $targetDir = Split-Path -Path $TargetPath -Parent
  if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  New-Item -ItemType HardLink -Force -Path $TargetPath -Target $SourcePath | Out-Null
}

$files = @(
  "docs\plans\PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md",
  "docs\plans\ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md"
)

foreach ($relativeFile in $files) {
  $source = Join-Path $AppRepoPath $relativeFile
  $target = Join-Path $WebRepoPath $relativeFile
  Sync-HardlinkFile -SourcePath $source -TargetPath $target
}

Write-Host "Hardlinks app->web atualizados com sucesso."
