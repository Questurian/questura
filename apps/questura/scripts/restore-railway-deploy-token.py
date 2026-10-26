#!/usr/bin/env python3
"""Privately restore Questura's Railway deploy credential; stdlib only.

Normal run: hidden token prompt -> validate scope -> atomic vault save -> GitHub.
--sync-saved: validate and sync an already saved token without asking for it.
--check: read-only check of the saved Railway token and GitHub secret metadata.
No deployments, Railway variables, account tokens or other secrets are changed.
"""

import argparse
import getpass
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tempfile


REPO = "Questurian/questura"
ENVIRONMENT = "production"
PROJECT_ID = "aa5759b2-a793-4f16-8e8b-8633cdc41cac"
ENVIRONMENT_ID = "e35f0d85-c66d-4f66-b781-d9e456bab8cb"
TOKEN_PAGE = f"https://railway.com/project/{PROJECT_ID}/settings/tokens"
VAULT = Path.home() / ".questura-vault" / "deploy.env"
VAULT_KEY = "RAILWAY_DEPLOY_TOKEN"
SECRET = "RAILWAY_TOKEN"
ASSIGNMENT = re.compile(r"^\s*(?:export\s+)?RAILWAY_DEPLOY_TOKEN\s*=")


class SetupError(Exception):
    pass


class PrivateParser(argparse.ArgumentParser):
    def error(self, _message):
        # argparse normally echoes unexpected arguments, possibly a pasted key.
        raise SetupError("Invalid options. Use --help; never put a token in command-line arguments.")


def normalize_token(value):
    value = value.strip()
    # Also accept a single copied environment assignment, without executing it.
    match = re.fullmatch(r"(?:export\s+)?(?:RAILWAY_TOKEN|RAILWAY_DEPLOY_TOKEN)\s*=\s*(.+)", value)
    if match:
        value = match.group(1)
    try:
        parts = shlex.split(value)
    except ValueError:
        parts = []
    if len(parts) != 1 or not re.fullmatch(r"[A-Za-z0-9._-]{16,4096}", parts[0]):
        raise SetupError("Paste ONE complete token value, not its name, masked **** value, or a command.")
    return parts[0]


def run(args, *, input=None):
    # Never put credentials in argv, logs, or exceptions. Capture child output.
    try:
        return subprocess.run(args, input=input, text=True, capture_output=True, timeout=45)
    except (OSError, subprocess.TimeoutExpired):
        raise SetupError(f"{args[0]} could not finish. No credential details were printed.") from None


def validate_token(token):
    query = "query { projectToken { projectId environmentId } }"
    response = run([
        "curl", "--silent", "--show-error", "--fail", "--max-time", "30",
        "--header", "@-", "--data-binary", json.dumps({"query": query}),
        "https://backboard.railway.com/graphql/v2",
    ], input=f"Project-Access-Token: {token}\nContent-Type: application/json\n")
    if response.returncode:
        raise SetupError("Railway validation request failed. Check connectivity; nothing was saved or synced.")
    try:
        body = json.loads(response.stdout)
        scope = (body.get("data") or {}).get("projectToken")
    except (ValueError, AttributeError, TypeError):
        raise SetupError("Railway returned an unexpected response; nothing was saved or synced.") from None
    if body.get("errors") or not isinstance(scope, dict):
        raise SetupError("Railway rejected this token. Create a NEW project token; an old invalid token or account token will not work.")
    if scope.get("projectId") != PROJECT_ID or scope.get("environmentId") != ENVIRONMENT_ID:
        raise SetupError("Wrong scope. Token must belong to project questura, environment production. Nothing was saved or synced.")


def read_saved(path=VAULT):
    if path.is_symlink():
        raise SetupError("Vault file is a symlink; refusing to read or replace it.")
    try:
        values = [line.split("=", 1)[1] for line in path.read_text().splitlines() if ASSIGNMENT.match(line)]
    except FileNotFoundError:
        raise SetupError("No saved deploy token. Run this script without flags to enter its replacement.") from None
    if len(values) != 1:
        raise SetupError("Vault needs exactly one RAILWAY_DEPLOY_TOKEN. Run without flags to repair it.")
    return normalize_token(values[0])


def save_token(token, path=VAULT):
    directory = path.parent
    if directory.is_symlink() or path.is_symlink():
        raise SetupError("Vault path is a symlink; refusing to replace it.")
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if directory.stat().st_uid != os.getuid() or (path.exists() and path.stat().st_uid != os.getuid()):
        raise SetupError("Vault is owned by another user; refusing to change it.")
    directory.chmod(0o700)
    original = path.read_text() if path.exists() else ""
    kept = [line for line in original.splitlines(keepends=True) if not ASSIGNMENT.match(line)]
    content = "".join(kept)
    if content and not content.endswith("\n"):
        content += "\n"
    content += f"{VAULT_KEY}={token}\n"
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", dir=directory, prefix=".deploy-", delete=False) as handle:
            temporary = Path(handle.name)
            os.fchmod(handle.fileno(), 0o600)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def github_ready():
    if run(["gh", "auth", "status", "--hostname", "github.com"]).returncode:
        raise SetupError("GitHub CLI needs sign-in. Run gh auth login, then rerun with --sync-saved.")
    if run(["gh", "api", f"repos/{REPO}/environments/{ENVIRONMENT}"]).returncode:
        raise SetupError("Cannot access the existing GitHub production environment. No environment or permissions were changed.")


def sync_github(token):
    github_ready()
    result = run(["gh", "secret", "set", SECRET, "--env", ENVIRONMENT, "--repo", REPO], input=token)
    if result.returncode:
        raise SetupError("GitHub secret update failed. Validated token remains in the vault; retry with --sync-saved. No token was printed.")


def main(argv=None):
    parser = PrivateParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--sync-saved", action="store_true", help="Validate vault token and update GitHub; no prompt")
    mode.add_argument("--check", action="store_true", help="Read-only validation and GitHub secret metadata check")
    parser.add_argument("--vault-only", action="store_true", help="Save validated replacement locally; sync GitHub later")
    args = parser.parse_args(argv)
    if args.vault_only and (args.check or args.sync_saved):
        parser.error("--vault-only is for entering a replacement, not --check or --sync-saved")
    for tool in ["curl"] + ([] if args.vault_only else ["gh"]):
        if not shutil.which(tool):
            raise SetupError(f"Required tool missing: {tool}. Nothing was installed.")

    print("Questura — restore Railway deployment access")
    print("Target: questura / production. One PROJECT token, not an account token.")
    if args.check or args.sync_saved:
        token = read_saved()
    else:
        if not sys.stdin.isatty():
            raise SetupError("Run in Terminal. Token entry must be hidden; command-line arguments and piped token input are not accepted.")
        print("Both old Railway rows may say invalid. Do not copy those masked values.")
        print(f"Open: {TOKEN_PAGE}")
        print("Create NEW token: name github-deploy-replacement; environment production.")
        print(f"It will be saved privately to {VAULT}")
        if not args.vault_only:
            print(f"It will also replace {REPO} → production → secret {SECRET}.")
        print("Paste its complete value below. Characters will NOT appear. Press Enter once.")
        # Refuse getpass's fallback that could echo a secret without a real TTY.
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            token = normalize_token(getpass.getpass("New Railway production project token: "))
    validate_token(token)
    print("✓ Railway confirms project questura, environment production.")
    if args.check:
        github_ready()
        result = run(["gh", "secret", "list", "--env", ENVIRONMENT, "--repo", REPO, "--json", "name"])
        try:
            present = result.returncode == 0 and any(item.get("name") == SECRET for item in json.loads(result.stdout))
        except (ValueError, TypeError, AttributeError):
            present = False
        if not present:
            raise SetupError("GitHub secret metadata could not confirm RAILWAY_TOKEN. Run --sync-saved.")
        print("✓ GitHub production secret exists. Its encrypted value cannot be read back.")
        return 0
    if not args.sync_saved:
        save_token(token)
        print("✓ Vault saved atomically with folder 700 / file 600; other secrets preserved.")
    if not args.vault_only:
        sync_github(token)
        print("✓ GitHub production RAILWAY_TOKEN updated through stdin; token never printed.")
    print("Done. Tell the agent to resume the existing deployment. This script starts no deployment.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (SetupError, OSError, getpass.GetPassWarning) as error:
        print(f"STOP: {error}", file=sys.stderr)
        raise SystemExit(1)
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled. No token was printed.", file=sys.stderr)
        raise SystemExit(130)
