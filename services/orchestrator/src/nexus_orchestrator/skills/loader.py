"""Load skill manifests from disk."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Default base path for core skills.
_SKILLS_BASE = Path(__file__).resolve().parents[4] / "skills" / "core"


class SkillLoader:
    """Loads skill manifest JSON files from the skills directory."""

    def __init__(self, base_path: Path | None = None) -> None:
        self._base = base_path or _SKILLS_BASE

    def load_manifests(self, skill_ids: list[str]) -> list[dict[str, Any]]:
        """Return a list of skill manifest dicts for the given *skill_ids*.

        Each skill is expected at ``<base>/<skill_id>/skill.json``.
        Missing skills are skipped with a warning.
        """
        manifests: list[dict[str, Any]] = []

        for skill_id in skill_ids:
            manifest_path = self._base / skill_id / "skill.json"
            if not manifest_path.exists():
                logger.warning("Skill manifest not found: %s", manifest_path)
                continue
            try:
                with manifest_path.open() as fh:
                    manifest = json.load(fh)
                manifests.append(manifest)
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Failed to load skill %s: %s", skill_id, exc)

        return manifests
