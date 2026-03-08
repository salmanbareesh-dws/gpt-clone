#!/usr/bin/env python
"""Codex CLI login helper (ChatGPT OAuth / device code).

Run this as admin to authenticate via ChatGPT OAuth.
All web app users will share this single OAuth session.

Usage:
  python scripts/codex_login.py --device-auth
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def _default_credentials_store() -> str:
    return "file" if sys.platform.startswith("win") else "auto"


def _write_config(codex_home: Path, credentials_store: str) -> Path:
    codex_home.mkdir(parents=True, exist_ok=True)
    config_path = codex_home / "config.toml"
    config_path.write_text(
        "\n".join(
            [
                "# Codex CLI config written by scripts/codex_login.py",
                f'cli_auth_credentials_store = "{credentials_store}"',
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return config_path


def _find_codex_exe() -> str | None:
    return shutil.which("codex")


def _run_codex(cmd: list[str], env: dict[str, str]) -> subprocess.CompletedProcess:
    if sys.platform.startswith("win") and cmd and cmd[0].lower().endswith((".cmd", ".bat")):
        return subprocess.run(["cmd.exe", "/c", *cmd], env=env, check=False)
    return subprocess.run(cmd, env=env, check=False)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Codex CLI login helper")
    parser.add_argument(
        "--device-auth",
        action="store_true",
        help="Use device code auth (recommended on Windows).",
    )
    parser.add_argument(
        "--codex-home",
        default="",
        help="Folder to use as CODEX_HOME (default: ~/.codex).",
    )
    parser.add_argument(
        "--credentials-store",
        choices=["auto", "keyring", "file"],
        default=_default_credentials_store(),
        help="Where Codex should cache credentials.",
    )

    args = parser.parse_args(argv)

    codex_exe = _find_codex_exe()
    if not codex_exe:
        print("Codex CLI not found on PATH.", file=sys.stderr)
        print("Install: npm i -g @openai/codex", file=sys.stderr)
        return 1

    codex_home = Path(args.codex_home).expanduser() if args.codex_home else Path.home() / ".codex"
    _write_config(codex_home, args.credentials_store)

    env = os.environ.copy()
    env["CODEX_HOME"] = str(codex_home)

    store_override = f'cli_auth_credentials_store="{args.credentials_store}"'

    print(f"Using CODEX_HOME: {codex_home}")
    print(f"Credential store: {args.credentials_store}")

    cmd = [codex_exe, "login", "-c", store_override]
    if args.device_auth:
        cmd.append("--device-auth")

    print("Running:", " ".join(cmd))
    try:
        result = _run_codex(cmd, env=env)
    except KeyboardInterrupt:
        return 130

    if result.returncode != 0:
        print(f"Login failed (exit code {result.returncode}).", file=sys.stderr)
        return result.returncode

    print("\nLogin succeeded!")
    print("The web app will now use this OAuth session for all users.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
