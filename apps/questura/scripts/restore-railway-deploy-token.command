#!/bin/bash
# Double-click on macOS to open the private prompt in Terminal.
set -u
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
if python3 "$SCRIPT_DIR/restore-railway-deploy-token.py" "$@"; then
  result=0
else
  result=$?
fi
if [[ -t 0 ]]; then
  printf '\nPress Return to close this window. '
  IFS= read -r reply || true
fi
exit "$result"
