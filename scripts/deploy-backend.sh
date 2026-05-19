#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/astralmarket}"
SERVICE_NAME="${SERVICE_NAME:-astralmarket-backend}"

cd "$APP_DIR"

corepack enable
pnpm install --frozen-lockfile
pnpm --filter backend build

if ! sudo systemctl restart "$SERVICE_NAME"; then
  sudo systemctl status "$SERVICE_NAME" --no-pager -l || true
  sudo journalctl -u "$SERVICE_NAME" -n 80 --no-pager || true
  exit 1
fi

if ! sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  sudo systemctl status "$SERVICE_NAME" --no-pager -l || true
  sudo journalctl -u "$SERVICE_NAME" -n 80 --no-pager || true
  exit 1
fi
