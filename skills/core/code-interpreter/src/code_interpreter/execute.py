"""Code Interpreter skill - executes Python or JavaScript in a sandboxed environment."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from typing import Any

MEMORY_LIMIT_BYTES = 256 * 1024 * 1024  # 256 MB


def _set_resource_limits() -> None:
    """Set resource limits for the child process (Unix only)."""
    try:
        import resource

        # Limit virtual memory to 256 MB.
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_LIMIT_BYTES, MEMORY_LIMIT_BYTES))
    except (ImportError, ValueError, OSError):
        # resource module may not be available or limits may not be settable.
        pass


def _run_python(code: str, timeout_seconds: int) -> dict[str, Any]:
    """Execute Python code in a subprocess with restricted environment."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False,
    ) as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    # Build a restricted environment: inherit minimal vars, no network.
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": os.environ.get("HOME", "/tmp"),
        "LANG": "en_US.UTF-8",
        "NO_PROXY": "*",
        "http_proxy": "http://0.0.0.0:0",
        "https_proxy": "http://0.0.0.0:0",
    }

    try:
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            env=env,
            preexec_fn=_set_resource_limits,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Error: execution timed out after {timeout_seconds} seconds",
            "exit_code": 124,
        }
    except Exception as exc:
        return {
            "stdout": "",
            "stderr": f"Error executing Python code: {exc}",
            "exit_code": 1,
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _run_javascript(code: str, timeout_seconds: int) -> dict[str, Any]:
    """Execute JavaScript code via Node.js in a subprocess."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".js", delete=False,
    ) as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin:/usr/local/bin"),
        "HOME": os.environ.get("HOME", "/tmp"),
        "NODE_OPTIONS": "--max-old-space-size=256",
        "NO_PROXY": "*",
        "http_proxy": "http://0.0.0.0:0",
        "https_proxy": "http://0.0.0.0:0",
    }

    try:
        result = subprocess.run(
            ["node", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            env=env,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }
    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "Error: Node.js is not installed or not in PATH",
            "exit_code": 1,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Error: execution timed out after {timeout_seconds} seconds",
            "exit_code": 124,
        }
    except Exception as exc:
        return {
            "stdout": "",
            "stderr": f"Error executing JavaScript code: {exc}",
            "exit_code": 1,
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def execute(
    code: str,
    language: str = "python",
    timeout_seconds: int = 30,
) -> dict[str, Any]:
    """Execute code in a sandboxed subprocess.

    Args:
        code: Source code to execute.
        language: Programming language - ``python`` or ``javascript``
            (default ``python``).
        timeout_seconds: Maximum execution time in seconds (default 30).

    Returns:
        A dict with ``stdout``, ``stderr``, ``exit_code``, and ``result``
        (the last line of stdout).
    """
    if language not in ("python", "javascript"):
        return {
            "stdout": "",
            "stderr": f"Error: unsupported language '{language}'. Must be 'python' or 'javascript'.",
            "exit_code": 1,
            "result": "",
        }

    if language == "python":
        run_result = _run_python(code, timeout_seconds)
    else:
        run_result = _run_javascript(code, timeout_seconds)

    stdout = run_result["stdout"]
    result = stdout.strip().split("\n")[-1] if stdout.strip() else ""

    return {
        "stdout": stdout,
        "stderr": run_result["stderr"],
        "exit_code": run_result["exit_code"],
        "result": result,
    }
