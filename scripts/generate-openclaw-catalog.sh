#!/usr/bin/env bash
# Generate the OpenClaw v1 model catalog from an openclaw/openclaw checkout whose
# dependencies are already installed (corepack enable && pnpm install --frozen-lockfile).
# The output is the --source-file input for scripts/publish-catalog.mjs.
#
# Usage: scripts/generate-openclaw-catalog.sh <openclaw-checkout> <output.json>
#
# Edits the checkout in place (see below), so point it at a dedicated clone.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <openclaw-checkout> <output.json>" >&2
  exit 2
fi
openclaw_dir=$1
output=$(realpath -m "$2")
script="$openclaw_dir/scripts/publish-model-catalog.mts"

# raise_limit NAME FROM_MIB TO_MIB: rewrite `const NAME = FROM * 1024 * 1024;` in the
# generator. If the line has changed upstream, keep OpenClaw's value and only warn.
raise_limit() {
  local old="const $1 = $2 * 1024 * 1024;" new="const $1 = $3 * 1024 * 1024;"
  if grep -qxF "$old" "$script"; then
    sed -i "s/^const $1 = $2 \* 1024 \* 1024;\$/$new/" "$script"
    grep -qxF "$new" "$script"
  elif ! grep -qxF "$new" "$script"; then
    echo "::warning::$1 changed upstream; running OpenClaw's value unpatched" >&2
  fi
}

# OpenClaw caps each pricing-source download at 5 MiB, and models.dev outgrew it on
# 2026-09-29, which stopped OpenClaw's own publish job.
raise_limit MAX_PRICING_CATALOG_BYTES 5 32
# OpenClaw fails its v1 bundle above its clients' 4 MiB limit; the bundle passed it on
# 2026-11-18. We strip pricing and other fields from it, and scripts/publish-catalog.mjs
# enforces the consumer's 4 MiB limit on the catalog we actually publish.
raise_limit CLIENT_BUNDLE_LIMIT_BYTES 4 32

cd "$openclaw_dir"
node --import tsx scripts/publish-model-catalog.mts --pricing --out "$output"
