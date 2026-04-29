# ╔══════════════════════════════════════════════════════════════╗
# ║                    Atlas Plugin Installer                    ║
# ║          Token optimization plugin for OpenCode CLI          ║
# ╚══════════════════════════════════════════════════════════════╝
# Usage: .\install.ps1 [-Force] [-Global]

param(
    [switch]$Force = $false,
    [switch]$Global = $false
)

$ErrorActionPreference = "Stop"

try {

# ── Colors & Symbols ─────────────────────────────────────────────
$ESC    = [char]27
$BOLD   = "$ESC[1m"
$DIM    = "$ESC[2m"
$GREEN  = "$ESC[32m"
$YELLOW = "$ESC[33m"
$RED    = "$ESC[31m"
$CYAN   = "$ESC[36m"
$BLUE   = "$ESC[34m"
$MAGENTA = "$ESC[35m"
$NC     = "$ESC[0m"

$CHECK   = [char]0x2713
$CROSS   = [char]0x2717
$WARN    = [char]0x26A0
$ARROW   = [char]0x25B8
$BOLT    = [char]0x26A1
$GEAR    = [char]0x2699
$SPARKLE = [char]0x2728

function Log-Info($msg)  { Write-Host "  ${DIM}${msg}${NC}" }
function Log-Ok($msg)    { Write-Host "  ${GREEN}${CHECK}${NC} ${msg}" }
function Log-Warn($msg)  { Write-Host "  ${YELLOW}${WARN}${NC} ${msg}" }
function Log-Err($msg)   { Write-Host "  ${RED}${CROSS}${NC} ${msg}" }
function Log-Step($msg)  { Write-Host "`n  ${CYAN}${ARROW}${NC} ${BOLD}${msg}${NC}" }

$GITHUB_RAW = "https://raw.githubusercontent.com/reactive-end/atlas/main"
$ATLAS_VERSION = "1.1.0"

# ── Banner ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ${CYAN}+======================================================+${NC}"
Write-Host "  ${CYAN}|${NC}                                                      ${CYAN}|${NC}"
Write-Host "  ${CYAN}|${NC}   ${BOLD}${MAGENTA}${BOLT} Atlas${NC}${BOLD} - Token Optimization for OpenCode${NC}        ${CYAN}|${NC}"
Write-Host "  ${CYAN}|${NC}                                                      ${CYAN}|${NC}"
Write-Host "  ${CYAN}|${NC}   ${DIM}v${ATLAS_VERSION} - 19 agents - Echo + Forge + Vault${NC}       ${CYAN}|${NC}"
Write-Host "  ${CYAN}|${NC}                                                      ${CYAN}|${NC}"
Write-Host "  ${CYAN}+======================================================+${NC}"
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

Log-Ok "Config dir: ${DIM}$opencodeDir${NC}"

# ── Step 2: Check existing install ───────────────────────────────
if ((Test-Path $entryPath) -and (-not $Force)) {
    Log-Warn "Atlas already installed at: $entryPath"
    Log-Info "Use -Force to reinstall"
    Read-Host "Press Enter to exit"
    return
}

# ── Step 3: Create directories ───────────────────────────────────
Log-Step "Creating directories..."
if (-not (Test-Path $pluginsDir)) {
    New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
}
Log-Ok "$pluginsDir"

# ── Step 4: Install plugin entry file ────────────────────────────
Log-Step "${GEAR} Installing plugin entry file..."

$localFound = $false
if ($null -ne $PSScriptRoot -and "$PSScriptRoot".Trim() -ne "") {
    $localParent = Split-Path $PSScriptRoot -Parent
    if ($null -ne $localParent -and "$localParent".Trim() -ne "") {
        $localSource = Join-Path $localParent "plugin\atlas.ts"
        if (Test-Path $localSource) {
            Copy-Item -Path $localSource -Destination $entryPath -Force
            Log-Ok "Copied from repo: ${DIM}$entryPath${NC}"
            $localFound = $true
        }
    }
}

if (-not $localFound) {
    Log-Info "Downloading plugin file..."
    try {
        Invoke-WebRequest -Uri "$GITHUB_RAW/plugin/atlas.ts" -OutFile $entryPath -UseBasicParsing
        Log-Ok "Downloaded: ${DIM}$entryPath${NC}"
    } catch {
        throw "Could not install plugin file. Check your internet connection."
    }
}

# ── Step 5: Create or merge package.json ─────────────────────────
Log-Step "Setting up package.json..."

function Get-AtlasPackageJson() {
    return @{
        "dependencies" = @{
            "@atlas-opencode/core" = "^$ATLAS_VERSION"
            "@opencode-ai/plugin" = "^1.4.3"
        }
        "optionalDependencies" = @{
            "better-sqlite3" = "^11.0.0"
        }
    }
}

if (Test-Path $packageJsonPath) {
    Log-Info "Existing package.json found, merging dependencies..."
    try {
        $raw = Get-Content $packageJsonPath -Raw
        $pkg = $raw | ConvertFrom-Json -AsHashtable
        if (-not $pkg.ContainsKey("dependencies")) {
            $pkg["dependencies"] = @{}
        }
        $pkg["dependencies"]["@atlas-opencode/core"] = "^$ATLAS_VERSION"
        $pkg["dependencies"]["@opencode-ai/plugin"] = "^1.4.3"
        if (-not $pkg.ContainsKey("optionalDependencies")) {
            $pkg["optionalDependencies"] = @{}
        }
        $pkg["optionalDependencies"]["better-sqlite3"] = "^11.0.0"
        $pkg | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
        Log-Ok "Merged: ${DIM}$packageJsonPath${NC}"
    } catch {
        Log-Warn "Merge failed, overwriting with fresh package.json"
        Get-AtlasPackageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
        Log-Ok "Created: ${DIM}$packageJsonPath${NC}"
    }
} else {
    Get-AtlasPackageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
    Log-Ok "Created: ${DIM}$packageJsonPath${NC}"
}

# ── Step 6: Create atlas config ──────────────────────────────────
Log-Step "${GEAR} Creating atlas.config.json..."

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
        "tactician":     { "model": "openai/gpt-5.4",      "skills": ["*"], "mcps": [] },
        "squire":        { "model": "openai/gpt-5.4-mini", "skills": ["*"], "mcps": [] }
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
    "compressMarkdown": true,
    "redundancyCacheEnabled": true,
    "redundancyCacheSize": 16
  },
  "vault": {
    "enabled": true,
    "injectMemoryProtocol": true,
    "stripPrivateTags": true
  },
  "athena": {
    "enabled": true,
    "skills": {
      "enabled": true
    },
    "candidates": {
      "enabled": false,
      "minToolCalls": 5,
      "maxCandidates": 50,
      "expireAfterDays": 30,
      "minConfidence": 60
    },
    "curator": {
      "enabled": false,
      "staleAfterDays": 30,
      "archiveAfterDays": 90,
      "autoArchive": false,
      "reviewEnabled": false
    }
  }
}
'@

if ((Test-Path $configPath) -and (-not $Force)) {
    Log-Info "Config already exists, skipping (use -Force to overwrite)"
} else {
    Set-Content -Path $configPath -Value $atlasConfig -Encoding UTF8
    Log-Ok "Created: ${DIM}$configPath${NC}"
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
    Log-Warn "No package manager found (bun/npm/pnpm)."
    Log-Info "OpenCode will auto-install on next startup."
    Log-Info "Or manually: cd `"$opencodeDir`" && npm install"
} else {
    Log-Info "Using $pm..."
    try {
        Push-Location $opencodeDir
        switch ($pm) {
            "bun"  { & bun install --no-save 2>&1 | Out-Null }
            "npm"  { & npm install --save 2>&1 | Out-Null }
            "pnpm" { & pnpm install 2>&1 | Out-Null }
        }
        Pop-Location
        Log-Ok "Dependencies installed via $pm"
    } catch {
        Pop-Location
        Log-Warn "$pm install had issues. OpenCode will retry on startup."
        Log-Info "Manual fallback: cd `"$opencodeDir`" && npm install"
    }
}

# ── Step 8: Verify installation ──────────────────────────────────
Log-Step "Verifying installation..."

$errors = 0

if (Test-Path $entryPath) {
    Log-Ok "Plugin:  ${DIM}$entryPath${NC}"
} else {
    Log-Err "Plugin:  MISSING"
    $errors++
}

if (Test-Path $configPath) {
    Log-Ok "Config:  ${DIM}$configPath${NC}"
} else {
    Log-Err "Config:  MISSING"
    $errors++
}

if (Test-Path $packageJsonPath) {
    Log-Ok "Deps:    ${DIM}$packageJsonPath${NC}"
} else {
    Log-Err "Deps:    MISSING"
    $errors++
}

$coreModule = Join-Path $opencodeDir "node_modules\@atlas-opencode\core"
if (Test-Path $coreModule) {
    Log-Ok "Core:    installed"
} else {
    Log-Warn "Core:    not yet installed (OpenCode will install on startup)"
}

if ($errors -gt 0) {
    Write-Host ""
    Log-Err "Installation had $errors error(s). Check output above."
    throw "Installation completed with $errors error(s)."
}

# ── Done ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ${GREEN}+======================================================+${NC}"
Write-Host "  ${GREEN}|${NC}                                                      ${GREEN}|${NC}"
Write-Host "  ${GREEN}|${NC}   ${SPARKLE} ${BOLD}Atlas installed successfully!${NC}                    ${GREEN}|${NC}"
Write-Host "  ${GREEN}|${NC}                                                      ${GREEN}|${NC}"
Write-Host "  ${GREEN}+======================================================+${NC}"
Write-Host ""
Write-Host "  ${BOLD}Modules:${NC}"
Write-Host "    ${BOLT} ${GREEN}Echo${NC}   - Output compression (lite/full/ultra)"
Write-Host "    ${GEAR} ${BLUE}Forge${NC}  - Tool output optimization + diff cache"
Write-Host "    * ${MAGENTA}Vault${NC}  - Persistent memory between sessions"
Write-Host "    > ${CYAN}Codex${NC}  - Repository indexing and search"
Write-Host ""
Write-Host "  ${BOLD}Agents:${NC} ${DIM}19 specialized agents (incl. Squire @runner)${NC}"
Write-Host ""
Write-Host "  ${BOLD}Commands:${NC}"
Write-Host "    ${DIM}/atlas-echo lite${NC}   - minimal compression"
Write-Host "    ${DIM}/atlas-echo full${NC}   - balanced (default)"
Write-Host "    ${DIM}/atlas-echo ultra${NC}  - maximum compression"
Write-Host "    ${DIM}/atlas-verbose${NC}     - disable compression"
Write-Host "    ${DIM}/atlas-status${NC}      - show status"
Write-Host ""
Write-Host "  ${DIM}Start or restart OpenCode to load the plugin.${NC}"
Write-Host ""

} catch {
    Write-Host ""
    Log-Err "Unexpected error: $_"
    Write-Host ""
}

Read-Host "Press Enter to exit"
