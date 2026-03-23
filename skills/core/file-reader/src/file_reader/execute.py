"""File Reader skill - reads and parses local files (TXT, JSON, CSV)."""

from __future__ import annotations

import csv
import io
import json
import os
from pathlib import Path
from typing import Any

EXTENSION_FORMAT_MAP = {
    ".txt": "txt",
    ".text": "txt",
    ".log": "txt",
    ".md": "txt",
    ".json": "json",
    ".csv": "csv",
}


def _detect_format(file_path: str) -> str:
    """Detect file format from extension."""
    ext = Path(file_path).suffix.lower()
    return EXTENSION_FORMAT_MAP.get(ext, "txt")


def _read_txt(file_path: str) -> str:
    """Read a text file and return its contents."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def _read_json(file_path: str) -> str:
    """Read a JSON file and return pretty-printed contents."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return json.dumps(data, indent=2, ensure_ascii=False)


def _read_csv(file_path: str) -> str:
    """Read a CSV file and return a formatted table string."""
    with open(file_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)

    if not rows:
        return ""

    # Calculate column widths for formatting.
    col_widths = [0] * len(rows[0])
    for row in rows:
        for i, cell in enumerate(row):
            if i < len(col_widths):
                col_widths[i] = max(col_widths[i], len(cell))

    lines: list[str] = []
    for row_idx, row in enumerate(rows):
        padded = [
            cell.ljust(col_widths[i]) if i < len(col_widths) else cell
            for i, cell in enumerate(row)
        ]
        lines.append(" | ".join(padded).rstrip())

        # Add a separator after the header row.
        if row_idx == 0:
            separator = "-+-".join("-" * w for w in col_widths)
            lines.append(separator)

    return "\n".join(lines)


FORMAT_READERS = {
    "txt": _read_txt,
    "json": _read_json,
    "csv": _read_csv,
}


def execute(file_path: str, format: str = "auto") -> dict[str, Any]:
    """Read and parse a local file.

    Args:
        file_path: Path to the file to read.
        format: File format - one of "auto", "txt", "json", "csv".
            When "auto", the format is detected from the file extension.

    Returns:
        A dict with ``content`` (parsed file contents as a string),
        ``format`` (detected or specified format), and ``size_bytes``.
    """
    resolved_path = str(Path(file_path).expanduser().resolve())

    try:
        size_bytes = os.path.getsize(resolved_path)
    except FileNotFoundError:
        return {
            "content": f"Error: file not found: {file_path}",
            "format": format if format != "auto" else "unknown",
            "size_bytes": 0,
        }

    detected_format = format if format != "auto" else _detect_format(resolved_path)
    reader = FORMAT_READERS.get(detected_format, _read_txt)

    try:
        content = reader(resolved_path)
    except FileNotFoundError:
        return {
            "content": f"Error: file not found: {file_path}",
            "format": detected_format,
            "size_bytes": 0,
        }
    except json.JSONDecodeError as exc:
        return {
            "content": f"Error: invalid JSON in {file_path}: {exc}",
            "format": detected_format,
            "size_bytes": size_bytes,
        }
    except Exception as exc:
        return {
            "content": f"Error reading {file_path}: {exc}",
            "format": detected_format,
            "size_bytes": size_bytes,
        }

    return {
        "content": content,
        "format": detected_format,
        "size_bytes": size_bytes,
    }
