param([switch]$SkipDockerCheck)
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    foreach ($command in @('node', 'npm.cmd', 'git')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Falta $command. Ver docs/entorno-desarrollo.md." }
    }
    $nodeVersion = & node --version
    if ($nodeVersion -notmatch '^v24\.') { throw "Se requiere Node 24 LTS. Detectado: $nodeVersion" }
    if (-not $SkipDockerCheck) {
        & docker info --format '{{.ServerVersion}}'
        if ($LASTEXITCODE -ne 0) { throw 'Abrí Docker Desktop y esperá a que el motor esté listo.' }
        & docker compose config --quiet
        if ($LASTEXITCODE -ne 0) { throw 'La configuración Docker no es válida.' }
    }
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de dependencias.' }
    & npm.cmd run postinstall
    if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de SQLite.' }
    & npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de TypeScript.' }
    Write-Host 'Entorno preparado. Escritorio: npm run dev | Docker: npm run docker:up'
} finally { Pop-Location }
