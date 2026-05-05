#!/usr/bin/env bash
# Package Lambda with backend `app` package for SQLAlchemy models + DB access.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PKG="$ROOT/lambda_package"
ZIP="$ROOT/lambda_function.zip"

rm -rf "$PKG" "$ZIP"
mkdir -p "$PKG"

pip install -r "$ROOT/lambda/requirements.txt" -t "$PKG"
cp "$ROOT/lambda"/*.py "$PKG/"
cp -R "$ROOT/app" "$PKG/app"

(cd "$PKG" && zip -r "$ZIP" .)
echo "Lambda package ready: $ZIP"
