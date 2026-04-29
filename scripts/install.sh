#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║                    Atlas Plugin Installer                    ║
# ║          Token optimization plugin for OpenCode CLI          ║
# ╚══════════════════════════════════════════════════════════════╝
# Usage: bash install.sh [--force] [--global]

set -e

# ── Colors & Symbols ─────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Unicode symbols
CHECK="✓"
CROSS="✗"
WARN="⚠"
ARROW="▸"
DIAMOND="◆"
GEAR="⚙"
PACKAGE="📦"
ROCKET="🚀"
SHIELD="🛡"
BRAIN="🧠"
BOLT="⚡"
SPARKLE="✨"

log_info()    { echo -e "  ${DIM}${1}${NC}"; }
log_ok()      { echo -e "  ${GREEN}${CHECK}${NC} ${1}"; }
log_warn()    { echo -e "  ${YELLOW}${WARN}${NC} ${1}"; }
log_err()     { echo -e "  ${RED}${CROSS}${NC} ${1}"; }
log_step()    { echo -e "\n  ${CYAN}${ARROW}${NC} ${BOLD}${1}${NC}"; }

FORCE=false
GLOBAL=false
GITHUB_RAW="https://raw.githubusercontent.com/reactive-end/atlas/main"
ATLAS_VERSION="1.1.0"

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)  FORCE=true; shift ;;
        --global|-g) GLOBAL=true; shift ;;
        --help|-h)
            echo ""
            echo -e "  ${BOLD}Atlas Plugin Installer${NC}"
            echo ""
            echo "  Usage: $0 [OPTIONS]"
            echo ""
            echo "  Options:"
            echo "    -f, --force    Overwrite existing files"
            echo "    -g, --global   Install to global config (~/.config/opencode)"
            echo "    -h, --help     Show this help"
            exit 0
            ;;
        *) log_err "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Banner ───────────────────────────────────────────────────────
echo ""
echo -e "  ${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "  ${CYAN}║${NC}                                                      ${CYAN}║${NC}"
echo -e "  ${CYAN}║${NC}   ${BOLD}${MAGENTA}⚡ Atlas${NC}${BOLD} — Token Optimization for OpenCode${NC}        ${CYAN}║${NC}"
echo -e "  ${CYAN}║${NC}                                                      ${CYAN}║${NC}"
echo -e "  ${CYAN}║${NC}   ${DIM}v${ATLAS_VERSION} • 19 agents • Echo + Forge + Vault${NC}       ${CYAN}║${NC}"
echo -e "  ${CYAN}║${NC}                                                      ${CYAN}║${NC}"
echo -e "  ${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Detect config directory ──────────────────────────────
log_step "Detecting OpenCode config directory..."

if [[ "$GLOBAL" == true ]]; then
    OPENCODE_DIR="$HOME/.config/opencode"
elif [[ -n "$OPENCODE_CONFIG_DIR" ]]; then
    OPENCODE_DIR="$OPENCODE_CONFIG_DIR"
elif [[ -d ".opencode" ]]; then
    OPENCODE_DIR="$(pwd)/.opencode"
else
    OPENCODE_DIR="$HOME/.config/opencode"
fi

PLUGINS_DIR="$OPENCODE_DIR/plugins"
ENTRY_PATH="$PLUGINS_DIR/atlas.ts"
CONFIG_PATH="$OPENCODE_DIR/atlas.config.json"
PACKAGE_JSON="$OPENCODE_DIR/package.json"

log_ok "Config dir: ${DIM}$OPENCODE_DIR${NC}"

# ── Step 2: Check existing install ───────────────────────────────
if [[ -f "$ENTRY_PATH" ]] && [[ "$FORCE" == false ]]; then
    log_warn "Atlas already installed at: $ENTRY_PATH"
    log_info "Use --force to reinstall"
    exit 1
fi

# ── Step 3: Create directories ───────────────────────────────────
log_step "${PACKAGE} Creating directories..."
mkdir -p "$PLUGINS_DIR"
log_ok "$PLUGINS_DIR"

# ── Step 4: Install plugin entry file ────────────────────────────
log_step "${GEAR} Installing plugin entry file..."

# Try local repo first, then download from GitHub
REPO_ROOT="$(cd "$(dirname "$0")/.." 2>/dev/null && pwd 2>/dev/null || true)"
SOURCE_FILE=""
if [[ -n "$REPO_ROOT" ]] && [[ -f "$REPO_ROOT/plugin/atlas.ts" ]]; then
    SOURCE_FILE="$REPO_ROOT/plugin/atlas.ts"
fi

if [[ -n "$SOURCE_FILE" ]]; then
    cp "$SOURCE_FILE" "$ENTRY_PATH"
    log_ok "Copied from repo: ${DIM}$ENTRY_PATH${NC}"
else
    log_info "Downloading from GitHub..."
    if command -v curl &>/dev/null; then
        curl -fsSL "$GITHUB_RAW/plugin/atlas.ts" -o "$ENTRY_PATH"
    elif command -v wget &>/dev/null; then
        wget -q "$GITHUB_RAW/plugin/atlas.ts" -O "$ENTRY_PATH"
    else
        log_err "Neither curl nor wget found. Install one of them."
        exit 1
    fi
    log_ok "Downloaded: ${DIM}$ENTRY_PATH${NC}"
fi

# ── Step 5: Create or merge package.json ─────────────────────────
log_step "${PACKAGE} Setting up package.json..."

if [[ -f "$PACKAGE_JSON" ]]; then
    log_info "Existing package.json found, merging dependencies..."
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf-8'));
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies['@atlas-opencode/core'] = '^${ATLAS_VERSION}';
        pkg.dependencies['@opencode-ai/plugin'] = '^1.4.3';
        if (!pkg.dependencies['better-sqlite3']) {
            pkg.optionalDependencies = pkg.optionalDependencies || {};
            pkg.optionalDependencies['better-sqlite3'] = '^11.0.0';
        }
        fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
    " 2>/dev/null || {
        cat > "$PACKAGE_JSON" << PKGJSON
{
  "dependencies": {
    "@atlas-opencode/core": "^${ATLAS_VERSION}",
    "@opencode-ai/plugin": "^1.4.3"
  },
  "optionalDependencies": {
    "better-sqlite3": "^11.0.0"
  }
}
PKGJSON
    }
    log_ok "Merged: ${DIM}$PACKAGE_JSON${NC}"
else
    cat > "$PACKAGE_JSON" << PKGJSON
{
  "dependencies": {
    "@atlas-opencode/core": "^${ATLAS_VERSION}",
    "@opencode-ai/plugin": "^1.4.3"
  },
  "optionalDependencies": {
    "better-sqlite3": "^11.0.0"
  }
}
PKGJSON
    log_ok "Created: ${DIM}$PACKAGE_JSON${NC}"
fi

# ── Step 6: Create atlas config ──────────────────────────────────
log_step "${GEAR} Creating atlas.config.json..."

if [[ -f "$CONFIG_PATH" ]] && [[ "$FORCE" == false ]]; then
    log_info "Config already exists, skipping (use --force to overwrite)"
else
    cat > "$CONFIG_PATH" << 'ATLASCFG'
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
ATLASCFG
    log_ok "Created: ${DIM}$CONFIG_PATH${NC}"
fi

# ── Step 7: Install dependencies ─────────────────────────────────
log_step "${PACKAGE} Installing npm dependencies..."

install_deps() {
    local pm="$1"
    local dir="$2"

    case "$pm" in
        bun)
            (cd "$dir" && bun install --no-save 2>&1)
            ;;
        npm)
            (cd "$dir" && npm install --save 2>&1)
            ;;
        pnpm)
            (cd "$dir" && pnpm install 2>&1)
            ;;
        *)
            return 1
            ;;
    esac
}

# Detect available package manager
PM=""
if command -v bun &>/dev/null; then
    PM="bun"
elif command -v npm &>/dev/null; then
    PM="npm"
elif command -v pnpm &>/dev/null; then
    PM="pnpm"
fi

if [[ -z "$PM" ]]; then
    log_warn "No package manager found (bun/npm/pnpm)."
    log_info "OpenCode will auto-install on next startup."
    log_info "Or manually: cd $OPENCODE_DIR && npm install"
else
    log_info "Using $PM..."
    if install_deps "$PM" "$OPENCODE_DIR" 2>/dev/null; then
        log_ok "Dependencies installed via $PM"
    else
        log_warn "$PM install failed. OpenCode will retry on startup."
        log_info "Manual fallback: cd $OPENCODE_DIR && npm install"
    fi
fi

# ── Step 8: Verify installation ──────────────────────────────────
log_step "${SHIELD} Verifying installation..."

ERRORS=0
[[ -f "$ENTRY_PATH" ]]    && log_ok "Plugin:  ${DIM}$ENTRY_PATH${NC}"    || { log_err "Plugin:  MISSING"; ((ERRORS++)); }
[[ -f "$CONFIG_PATH" ]]   && log_ok "Config:  ${DIM}$CONFIG_PATH${NC}"   || { log_err "Config:  MISSING"; ((ERRORS++)); }
[[ -f "$PACKAGE_JSON" ]]  && log_ok "Deps:    ${DIM}$PACKAGE_JSON${NC}"  || { log_err "Deps:    MISSING"; ((ERRORS++)); }

if [[ -d "$OPENCODE_DIR/node_modules/@atlas-opencode/core" ]]; then
    log_ok "Core:    installed"
else
    log_warn "Core:    not yet installed (OpenCode will install on startup)"
fi

if [[ $ERRORS -gt 0 ]]; then
    echo ""
    log_err "Installation had $ERRORS error(s). Check output above."
    exit 1
fi

# ── Done ─────────────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "  ${GREEN}║${NC}                                                      ${GREEN}║${NC}"
echo -e "  ${GREEN}║${NC}   ${SPARKLE} ${BOLD}Atlas installed successfully!${NC}                    ${GREEN}║${NC}"
echo -e "  ${GREEN}║${NC}                                                      ${GREEN}║${NC}"
echo -e "  ${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Modules:${NC}"
echo -e "    ${BOLT} ${GREEN}Echo${NC}   — Output compression (lite/full/ultra)"
echo -e "    ${GEAR} ${BLUE}Forge${NC}  — Tool output optimization + diff cache"
echo -e "    ${BRAIN} ${MAGENTA}Vault${NC}  — Persistent memory between sessions"
echo -e "    ${ROCKET} ${CYAN}Codex${NC}  — Repository indexing and search"
echo ""
echo -e "  ${BOLD}Agents:${NC} ${DIM}19 specialized agents (incl. Squire @runner)${NC}"
echo ""
echo -e "  ${BOLD}Commands:${NC}"
echo -e "    ${DIM}/atlas-echo lite${NC}   — minimal compression"
echo -e "    ${DIM}/atlas-echo full${NC}   — balanced (default)"
echo -e "    ${DIM}/atlas-echo ultra${NC}  — maximum compression"
echo -e "    ${DIM}/atlas-verbose${NC}     — disable compression"
echo -e "    ${DIM}/atlas-status${NC}      — show status"
echo ""
echo -e "  ${DIM}Start or restart OpenCode to load the plugin.${NC}"
echo ""
