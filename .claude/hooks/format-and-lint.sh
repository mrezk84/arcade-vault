#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

input="$(cat)"
file_path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$file_path" || ! -f "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  "$PROJECT_DIR"/node_modules/*|"$PROJECT_DIR"/.next/*|"$PROJECT_DIR"/out/*|"$PROJECT_DIR"/build/*)
    exit 0
    ;;
  "$PROJECT_DIR"/*)
    ;;
  *)
    exit 0
    ;;
esac

cd "$PROJECT_DIR"

npx --no-install prettier --write --ignore-unknown "$file_path" >/dev/null 2>&1 || true

case "$file_path" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
    lint_output="$(npx --no-install eslint --fix "$file_path" 2>&1)" && exit 0
    echo "$lint_output" >&2
    exit 2
    ;;
esac

exit 0
