# Product template: /start -> kit submodule Invoke-KitStart (fail-closed)
# Copy to <product>/.cursor/hooks/ and merge hooks.json from hooks.json.example
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$configPath = Join-Path $projectRoot ".cursor-kit.json"
$kitPath = "vendor/cursor-workspace-kit"
if (Test-Path -LiteralPath $configPath) {
    $cfg = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($cfg.kitPath) { $kitPath = [string]$cfg.kitPath }
}

$commonPath = Join-Path $projectRoot (Join-Path $kitPath "scripts\Kit-HookCommon.ps1")
if (-not (Test-Path -LiteralPath $commonPath)) {
    [Console]::Out.WriteLine('{"continue":false,"user_message":"Kit-HookCommon.ps1 not found. Run: git submodule update --init"}')
    exit 2
}
. $commonPath
Initialize-KitHookConsole

function Get-AllStringValues {
    param([object]$Node)
    $values = New-Object System.Collections.Generic.List[string]
    if ($null -eq $Node) { return $values }
    if ($Node -is [string]) { $values.Add($Node); return $values }
    if ($Node -is [System.Collections.IDictionary]) {
        foreach ($key in $Node.Keys) {
            foreach ($item in (Get-AllStringValues -Node $Node[$key])) { $values.Add($item) }
        }
        return $values
    }
    if ($Node -is [System.Collections.IEnumerable] -and -not ($Node -is [string])) {
        foreach ($entry in $Node) {
            foreach ($item in (Get-AllStringValues -Node $entry)) { $values.Add($item) }
        }
        return $values
    }
    foreach ($prop in $Node.PSObject.Properties) {
        foreach ($item in (Get-AllStringValues -Node $prop.Value)) { $values.Add($item) }
    }
    return $values
}

function Get-PromptText {
    param([object]$Payload)
    if ($null -eq $Payload) { return "" }
    if ($Payload.PSObject.Properties.Name -contains "prompt") { return [string]$Payload.prompt }
    $all = Get-AllStringValues -Node $Payload
    if ($all.Count -eq 0) { return "" }
    return ($all -join "`n")
}

function Read-KitStartLastMessage {
    param([string]$StatePath)
    if (-not (Test-Path -LiteralPath $StatePath)) {
        return "Kit start failed. Run: powershell -File vendor/cursor-workspace-kit/scripts/Invoke-KitStart.ps1 -WorkspaceRoot ."
    }
    try {
        $state = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($state.message) { return [string]$state.message }
    }
    catch { }
    return "Kit start failed. See .cursor/state/kit-start-last.json"
}

try {
    $payload = Read-HookStdinJson
    if ($null -eq $payload) { exit 0 }

    $prompt = Get-PromptText -Payload $payload
    if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }
    if ($prompt -notmatch '^\s*/start(\s+|$)') { exit 0 }

    $startScript = Join-Path $projectRoot (Join-Path $kitPath "scripts\Invoke-KitStart.ps1")
    if (-not (Test-Path -LiteralPath $startScript)) {
        Write-HookJson -Object @{
            continue     = $false
            user_message = "Invoke-KitStart.ps1 not found at $startScript. Run: git submodule update --init"
        }
        exit 2
    }

    & powershell -NoProfile -ExecutionPolicy Bypass -File $startScript -WorkspaceRoot $projectRoot
    if ($LASTEXITCODE -ne 0) {
        $statePath = Join-Path $projectRoot ".cursor\state\kit-start-last.json"
        $message = Read-KitStartLastMessage -StatePath $statePath
        Write-HookJson -Object @{
            continue     = $false
            user_message = $message
        }
        exit 2
    }

    Write-HookJson -Object @{ continue = $true }
    exit 0
}
catch {
    Write-HookJson -Object @{
        continue     = $false
        user_message = "Kit start hook error: $(Get-HookErrorText -ErrorRecord $_)"
    }
    exit 2
}
