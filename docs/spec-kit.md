# Spec Kit en este proyecto

Instalado el 2026-09-17: Specify CLI **1.0.7**, release oficial de GitHub y paquete
`specify-cli` de PyPI. Entorno aislado local `.tools/spec-kit`, integración Codex
en modo skills y scripts PowerShell. No se instaló una extensión de GitHub ni
se creó un repositorio remoto. No hace falta Copilot para usarlo con Codex.

```powershell
.\scripts\specify.ps1 --version
.\scripts\specify.ps1 check
```

Reinstalar con Python 3.11+ disponible:

```powershell
python -m venv .tools/spec-kit
.\.tools\spec-kit\Scripts\python.exe -m pip install specify-cli==1.0.7
```

La inicialización ya se ejecutó con:

```powershell
.\scripts\specify.ps1 init --here --force --non-interactive --integration codex --integration-options='--skills' --script ps --ignore-agent-tools
```

Skills locales: `$speckit-constitution`, `$speckit-specify`, `$speckit-plan`,
`$speckit-tasks`, `$speckit-analyze`, `$speckit-implement`, `$speckit-converge`.
Son instrucciones para el agente, no comandos PowerShell. Las ocho specs son
features independientes redactadas según los templates oficiales; cada una tiene
spec, plan, investigación, datos, contrato, guía de validación y tareas.

Feature activa inicial: `.specify/feature.json` apunta a `specs/001-desktop-core`.
Para seleccionar otra en una sesión PowerShell:

```powershell
$env:SPECIFY_FEATURE_DIRECTORY = 'specs/003-stock-ledger'
.\.specify\scripts\powershell\check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
```

Cambiar también `feature_directory` en `.specify/feature.json` si se desea persistir
la selección. No ejecutar implement hasta revisar el borrador. Las plantillas y
skills instaladas se versionan; el entorno `.tools` se reconstruye.

Fuente: [instalación oficial](https://github.github.com/spec-kit/installation.html),
[repositorio oficial](https://github.com/github/spec-kit).
