param([Parameter(ValueFromRemainingArguments = $true)][string[]]$SpecifyArgs)
$ErrorActionPreference = 'Stop'
$cliPath = Join-Path $PSScriptRoot '..\.tools\spec-kit\Scripts\specify.exe'
if (-not (Test-Path -LiteralPath $cliPath)) {
    throw 'Falta Specify CLI. Ver docs/spec-kit.md para reinstalarlo.'
}
& $cliPath @SpecifyArgs
exit $LASTEXITCODE
