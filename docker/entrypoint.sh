#!/bin/sh
set -eu

# A named Linux volume keeps native binaries separate from Windows node_modules.
# Refresh it only when the lockfile/runtime changes, including after image rebuilds.
signature="$(sha256sum package-lock.json package.json .npmrc scripts/install-native.mjs | sha256sum | cut -d ' ' -f 1)-$(node -p 'process.versions.modules')-$(uname -m)"
marker="node_modules/.bocha-dependency-signature"
if [ ! -f "$marker" ] || [ "$(cat "$marker")" != "$signature" ]; then
  npm ci --ignore-scripts
  npm run postinstall
  printf '%s' "$signature" > "$marker"
fi
exec "$@"
