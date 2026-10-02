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

# OpenClaw caps each pricing-source download at 5 MiB, and models.dev outgrew it on
# 2026-09-29, which stopped OpenClaw's own publish job. Raise the cap locally; if the
# line has changed upstream, keep their value and only warn.
old='const MAX_PRICING_CATALOG_BYTES = 5 * 1024 * 1024;'
new='const MAX_PRICING_CATALOG_BYTES = 32 * 1024 * 1024;'
if grep -qxF "$old" "$script"; then
  sed -i "s/^const MAX_PRICING_CATALOG_BYTES = 5 \* 1024 \* 1024;$/$new/" "$script"
  grep -qxF "$new" "$script"
elif ! grep -qxF "$new" "$script"; then
  echo "::warning::MAX_PRICING_CATALOG_BYTES changed upstream; running OpenClaw's value unpatched" >&2
fi

cd "$openclaw_dir"
node --import tsx scripts/publish-model-catalog.mts --pricing --out "$output"
