# Atlas Plugin Installer for Windows (PowerShell)
# Fully automated: dirs, files, dependencies, config
# Usage: .\install.ps1 [-Force] [-Global]

param(
    [switch]$Force = $false,
    [switch]$Global = $false
)

$ErrorActionPreference = "Stop"

try {

$ESC    = [char]27
$GREEN  = "$ESC[32m"
$YELLOW = "$ESC[33m"
$RED    = "$ESC[31m"
$CYAN   = "$ESC[36m"
$NC     = "$ESC[0m"

function Log-Info($msg)  { Write-Host "[i] $msg" }
function Log-Ok($msg)    { Write-Host "${GREEN}[✓]${NC} $msg" }
function Log-Warn($msg)  { Write-Host "${YELLOW}[!]${NC} $msg" }
function Log-Err($msg)   { Write-Host "${RED}[✗]${NC} $msg" }
function Log-Step($msg)  { Write-Host "${CYAN}>>>${NC} $msg" }

$GITHUB_RAW = "https://raw.githubusercontent.com/reactive-end/atlas/main"

Write-Host ""
Log-Info "Atlas Plugin Installer"
Log-Info "======================"
Write-Host ""

# ── Step 1: Detect config directory ──────────────────────────────
Log-Step "Detecting OpenCode config directory..."

if ($Global) {
    $opencodeDir = Join-Path $env:USERPROFILE ".config\opencode"
} elseif ($env:OPENCODE_CONFIG_DIR) {
    $opencodeDir = $env:OPENCODE_CONFIG_DIR
} elseif (Test-Path ".opencode") {
    $opencodeDir = Join-Path (Get-Location) ".opencode"
} else {
    $opencodeDir = Join-Path $env:USERPROFILE ".config\opencode"
}

$pluginsDir = Join-Path $opencodeDir "plugins"
$entryPath = Join-Path $pluginsDir "atlas.ts"
$configPath = Join-Path $opencodeDir "atlas.config.json"
$packageJsonPath = Join-Path $opencodeDir "package.json"

Log-Info "  Config dir: $opencodeDir"

# ── Step 2: Check existing install ───────────────────────────────
if ((Test-Path $entryPath) -and (-not $Force)) {
    Log-Warn "Atlas already installed at: $entryPath"
    Log-Info "Use -Force to reinstall"
    exit 1
}

# ── Step 3: Create directories ───────────────────────────────────
Log-Step "Creating directories..."
if (-not (Test-Path $pluginsDir)) {
    New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
}
Log-Ok "  $pluginsDir"

# ── Step 4: Install plugin entry file ────────────────────────────
Log-Step "Installing plugin entry file..."

$repoRoot   = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { "" }
$sourceFile = if ($repoRoot) { Join-Path $repoRoot "plugin\atlas.ts" } else { "" }

if (Test-Path $sourceFile) {
    Copy-Item -Path $sourceFile -Destination $entryPath -Force
    Log-Ok "  Copied from repo: $entryPath"
} else {
    Log-Info "  Downloading from GitHub..."
    try {
        Invoke-WebRequest -Uri "$GITHUB_RAW/plugin/atlas.ts" -OutFile $entryPath -UseBasicParsing
        Log-Ok "  Downloaded: $entryPath"
    } catch {
        Log-Err "  Download failed: $_"
        Log-Err "  Check your internet connection and try again."
        exit 1
    }
}

# ── Step 5: Create or merge package.json ─────────────────────────
Log-Step "Setting up package.json..."

function Get-AtlasPackageJson() {
    return @{
        "dependencies" = @{
            "@atlas-opencode/core" = "^1.0.6"
            "@opencode-ai/plugin" = "^1.4.3"
        }
        "optionalDependencies" = @{
            "better-sqlite3" = "^11.0.0"
        }
    }
}

if (Test-Path $packageJsonPath) {
    Log-Info "  Existing package.json found, merging dependencies..."
    try {
        $raw = Get-Content $packageJsonPath -Raw
        $pkg = $raw | ConvertFrom-Json -AsHashtable
        if (-not $pkg.ContainsKey("dependencies")) {
            $pkg["dependencies"] = @{}
        }
        $pkg["dependencies"]["@atlas-opencode/core"] = "^1.0.6"
        $pkg["dependencies"]["@opencode-ai/plugin"] = "^1.4.3"
        if (-not $pkg.ContainsKey("optionalDependencies")) {
            $pkg["optionalDependencies"] = @{}
        }
        $pkg["optionalDependencies"]["better-sqlite3"] = "^11.0.0"
        $pkg | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
        Log-Ok "  Merged: $packageJsonPath"
    } catch {
        Log-Warn "  Merge failed, overwriting with fresh package.json"
        Get-AtlasPackageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
        Log-Ok "  Created: $packageJsonPath"
    }
} else {
    Get-AtlasPackageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
    Log-Ok "  Created: $packageJsonPath"
}

# ── Step 6: Create atlas config ──────────────────────────────────
Log-Step "Creating atlas.config.json..."

$atlasConfig = @'
{
  "$schema": "https://unpkg.com/@atlas-opencode/core@latest/atlas.config.schema.json",
  "echo": {
    "enabled": true,
    "defaultLevel": "full",
    "autoClarityEnabled": true
  },
  "agents": {
    "enabled": true,
    "preset": "default",
    "defaultMode": "echo",
    "forceEchoOnAll": true,
    "presets": {
      "default": {
        "atlas":         { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "pathfinder":    { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "archivist":     { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": ["websearch", "grep_app"] },
        "elder":         { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "artisan":       { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "mender":        { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "tribunal":      { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "inspector":     { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "scribe":        { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "curator":       { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "sentinel":      { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "herald":        { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "lorekeeper":    { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "alchemist":     { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "magistrate":    { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "envoy":         { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "quartermaster": { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "tactician":     { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] }
      },
      "performance": {
        "atlas":         { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "pathfinder":    { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "archivist":     { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": ["websearch", "grep_app"] },
        "elder":         { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "artisan":       { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "mender":        { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "tribunal":      { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "inspector":     { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "scribe":        { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "curator":       { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "sentinel":      { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "herald":        { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "lorekeeper":    { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "alchemist":     { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "magistrate":    { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "envoy":         { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "quartermaster": { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] },
        "tactician":     { "model": "openai/gpt-5.4", "skills": ["*"], "mcps": [] }
      },
      "economy": {
        "atlas":         { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "pathfinder":    { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "archivist":     { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "elder":         { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "artisan":       { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "mender":        { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "tribunal":      { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "inspector":     { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "scribe":        { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "curator":       { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "sentinel":      { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "herald":        { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "lorekeeper":    { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "alchemist":     { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "magistrate":    { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "envoy":         { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "quartermaster": { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] },
        "tactician":     { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] }
      },
      "premium": {
        "atlas":         { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "pathfinder":    { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "archivist":     { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": ["websearch", "grep_app"] },
        "elder":         { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "artisan":       { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "mender":        { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "tribunal":      { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "inspector":     { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "scribe":        { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "curator":       { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "sentinel":      { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "herald":        { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "lorekeeper":    { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "alchemist":     { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "magistrate":    { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "envoy":         { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "quartermaster": { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] },
        "tactician":     { "model": "anthropic/claude-opus-4.6", "skills": ["*"], "mcps": [] }
      }
    }
  },
  "forge": {
    "enabled": true,
    "binaryPath": null,
    "adaptiveIntensity": true,
    "maxLines": 200,
    "dedupMin": 3,
    "summarizeThresholdLines": 500,
    "compactThresholdTokens": 120000,
    "bypass": ["docker exec", "psql", "mysql", "ssh"],
    "compressMarkdown": false,
    "redundancyCacheEnabled": true,
    "redundancyCacheSize": 16
  },
  "vault": {
    "enabled": true,
    "injectMemoryProtocol": true,
    "stripPrivateTags": true
  }
}
'@

if ((Test-Path $configPath) -and (-not $Force)) {
    Log-Info "  Config already exists, skipping (use -Force to overwrite)"
} else {
    Set-Content -Path $configPath -Value $atlasConfig -Encoding UTF8
    Log-Ok "  Created: $configPath"
}

# ── Step 7: Install dependencies ─────────────────────────────────
Log-Step "Installing npm dependencies..."

$pm = $null
if (Get-Command bun -ErrorAction SilentlyContinue) {
    $pm = "bun"
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    $pm = "npm"
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pm = "pnpm"
}

if (-not $pm) {
    Log-Warn "  No package manager found (bun/npm/pnpm)."
    Log-Info "  OpenCode will auto-install on next startup."
    Log-Info "  Or manually: cd `"$opencodeDir`" && npm install"
} else {
    Log-Info "  Using $pm..."
    try {
        Push-Location $opencodeDir
        switch ($pm) {
            "bun"  { & bun install --no-save 2>&1 | Out-Null }
            "npm"  { & npm install --save 2>&1 | Out-Null }
            "pnpm" { & pnpm install 2>&1 | Out-Null }
        }
        Pop-Location
        Log-Ok "  Dependencies installed via $pm"
    } catch {
        Pop-Location
        Log-Warn "  $pm install had issues. OpenCode will retry on startup."
        Log-Info "  Manual fallback: cd `"$opencodeDir`" && npm install"
    }
}

# ── Step 8: Verify installation ──────────────────────────────────
Log-Step "Verifying installation..."

$errors = 0

if (Test-Path $entryPath) {
    Log-Ok "  Plugin:  $entryPath"
} else {
    Log-Err "  Plugin:  MISSING"
    $errors++
}

if (Test-Path $configPath) {
    Log-Ok "  Config:  $configPath"
} else {
    Log-Err "  Config:  MISSING"
    $errors++
}

if (Test-Path $packageJsonPath) {
    Log-Ok "  Deps:    $packageJsonPath"
} else {
    Log-Err "  Deps:    MISSING"
    $errors++
}

$coreModule = Join-Path $opencodeDir "node_modules\@atlas-opencode\core"
if (Test-Path $coreModule) {
    Log-Ok "  Core:    installed"
} else {
    Log-Warn "  Core:    not yet installed (OpenCode will install on startup)"
}

if ($errors -gt 0) {
    Write-Host ""
    Log-Err "Installation had $errors error(s). Check output above."
    exit 1
}

# ── Done ─────────────────────────────────────────────────────────
Write-Host ""
Log-Info "============================="
Log-Ok "Atlas installed successfully!"
Log-Info "============================="
Write-Host ""
Log-Info "Start or restart OpenCode to load the plugin."
Log-Info ""
Log-Info "Echo mode: ON by default (full level)"
Log-Info "  /atlas-echo lite   — minimal compression"
Log-Info "  /atlas-echo full   — balanced (default)"
Log-Info "  /atlas-echo ultra  — maximum compression"
Log-Info "  /atlas-verbose     — disable all compression"
Write-Host ""

} catch {
    Write-Host ""
    Log-Err "Error inesperado: $_"
    Write-Host ""
}

Read-Host "Presiona Enter para salir"
