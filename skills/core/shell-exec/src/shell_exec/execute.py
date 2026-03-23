"""Shell Executor skill - executes allow-listed shell commands."""

from __future__ import annotations

import shlex
import subprocess
from typing import Any

ALLOW_LIST = [
    "ls", "cat", "head", "tail", "wc", "grep", "find", "git", "docker",
    "kubectl", "date", "whoami", "pwd", "df", "du", "ps", "echo", "env",
    "curl", "ping",
]


def execute(command: str, timeout_seconds: int = 30) -> dict[str, Any]:
    """Execute a shell command if it is in the allow-list.

    Args:
        command: The shell command to execute.
        timeout_seconds: Maximum time in seconds before the command is killed
            (default 30).

    Returns:
        A dict with ``stdout``, ``stderr``, and ``exit_code``.
    """
    try:
        parts = shlex.split(command)
    except ValueError as exc:
        return {
            "stdout": "",
            "stderr": f"Error parsing command: {exc}",
            "exit_code": 1,
        }

    if not parts:
        return {
            "stdout": "",
            "stderr": "Error: empty command",
            "exit_code": 1,
        }

    base_command = parts[0].split("/")[-1]  # handle absolute paths

    if base_command not in ALLOW_LIST:
        return {
            "stdout": "",
            "stderr": (
                f"Error: command '{base_command}' is not allowed. "
                f"Allowed commands: {', '.join(sorted(ALLOW_LIST))}"
            ),
            "exit_code": 1,
        }

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Error: command timed out after {timeout_seconds} seconds",
            "exit_code": 124,
        }
    except Exception as exc:
        return {
            "stdout": "",
            "stderr": f"Error executing command: {exc}",
            "exit_code": 1,
        }
