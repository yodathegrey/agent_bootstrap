"""Execute skills by resolving entry-points dynamically."""

from __future__ import annotations

import importlib
import logging
from typing import Any

logger = logging.getLogger(__name__)


class SkillExecutor:
    """Dynamically import and invoke a skill's entry-point function.

    A skill manifest's ``entry_point`` field has the format
    ``module_path:function_name`` (e.g. ``web_search:execute``).
    """

    async def execute(
        self,
        skill_manifest: dict[str, Any],
        input_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Run the skill and return its result dict.

        On any failure an error dict is returned rather than raising.
        """
        entry_point: str = skill_manifest.get("entry_point", "")
        if not entry_point or ":" not in entry_point:
            return {
                "error": True,
                "message": f"Invalid entry_point: {entry_point!r}",
            }

        module_path, func_name = entry_point.rsplit(":", 1)

        try:
            module = importlib.import_module(module_path)
        except ModuleNotFoundError as exc:
            logger.error("Skill module not found: %s (%s)", module_path, exc)
            return {"error": True, "message": f"Module not found: {module_path}"}

        func = getattr(module, func_name, None)
        if func is None:
            logger.error("Function %s not found in %s", func_name, module_path)
            return {
                "error": True,
                "message": f"Function {func_name} not found in {module_path}",
            }

        try:
            result = func(input_data)
            # Support both sync and async entry-points.
            if hasattr(result, "__await__"):
                result = await result
            return result if isinstance(result, dict) else {"output": result}
        except Exception as exc:
            logger.exception("Skill execution failed: %s", entry_point)
            return {"error": True, "message": str(exc)}
