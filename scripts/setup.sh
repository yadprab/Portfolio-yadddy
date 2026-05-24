#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

c_dim="\033[2m"
c_amber="\033[38;5;215m"
c_green="\033[38;5;114m"
c_red="\033[38;5;167m"
c_reset="\033[0m"

step() { printf "${c_amber}→${c_reset} %s\n" "$1"; }
ok()   { printf "${c_green}✓${c_reset} %s\n" "$1"; }
warn() { printf "${c_red}⚠${c_reset} %s\n" "$1"; }
dim()  { printf "${c_dim}%s${c_reset}\n" "$1"; }

REQUIRED_NODE_MAJOR=22

printf "\n${c_amber}yaddev${c_reset} ${c_dim}// bootstrap${c_reset}\n\n"

step "checking node version manager"

SWITCHED_VIA=""

if command -v fnm >/dev/null 2>&1; then
  ok "fnm detected"
  eval "$(fnm env --use-on-cd)"
  fnm install
  fnm use
  SWITCHED_VIA="fnm"
elif [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  ok "nvm detected"
  # shellcheck disable=SC1091
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm install
  nvm use
  SWITCHED_VIA="nvm"
else
  CURRENT_NODE="$(node -v 2>/dev/null || echo none)"
  CURRENT_MAJOR="$(echo "$CURRENT_NODE" | sed -E 's/^v([0-9]+).*/\1/')"

  if [ "$CURRENT_MAJOR" = "$REQUIRED_NODE_MAJOR" ] || \
     { [ "$CURRENT_MAJOR" -ge 20 ] 2>/dev/null && [ "$CURRENT_MAJOR" != 21 ] && [ "$CURRENT_MAJOR" != 23 ]; }; then
    ok "node $CURRENT_NODE accepted (no version manager, system node ok)"
  else
    warn "no fnm or nvm found, and current node ($CURRENT_NODE) is not supported"
    dim "  required: node ^20 LTS, ^22 LTS, or >=24"
    dim ""
    dim "  install fnm (recommended):"
    dim "    curl -fsSL https://fnm.vercel.app/install | bash"
    dim ""
    dim "  or nvm:"
    dim "    https://github.com/nvm-sh/nvm#install--update-script"
    exit 1
  fi
fi

ACTIVE_NODE="$(node -v)"
ACTIVE_MAJOR="$(echo "$ACTIVE_NODE" | sed -E 's/^v([0-9]+).*/\1/')"

if [ "$ACTIVE_MAJOR" = 21 ] || [ "$ACTIVE_MAJOR" = 23 ] || [ "$ACTIVE_MAJOR" -lt 20 ] 2>/dev/null; then
  warn "node version switch did not take effect (still on $ACTIVE_NODE)"
  dim ""
  dim "  this happens when your shell's default node is unsupported."
  dim "  fix:"
  if [ "$SWITCHED_VIA" = "nvm" ]; then
    dim "    nvm alias default 22"
  elif [ "$SWITCHED_VIA" = "fnm" ]; then
    dim "    fnm default 22"
  fi
  dim "    then open a new terminal and rerun this script"
  exit 1
fi

ok "node $ACTIVE_NODE"

step "enabling corepack"
if corepack enable 2>/dev/null; then
  ok "corepack ready"
else
  warn "corepack enable failed (may need sudo)"
  dim "  try:  sudo corepack enable"
  dim "  or install pnpm globally:  npm i -g pnpm"
fi

step "installing dependencies"
pnpm install

printf "\n${c_green}✓ primed${c_reset}\n\n"
dim "  watch:    pnpm watch     // dev server with HMR"
dim "  bundle:   pnpm bundle    // production build"
dim "  serve:    pnpm serve     // preview the bundle"
dim "  analyze:  pnpm analyze   // typecheck & diagnostics"
dim ""
dim "  http://localhost:4321"
printf "\n"
