"""Build LLM context from agent definitions, skills, memory, and history."""

from __future__ import annotations

from typing import Any


class ContextBuilder:
    """Assembles the full prompt context for an LLM call."""

    @staticmethod
    def build_system_prompt(agent_def: dict[str, Any], skills: list[dict[str, Any]]) -> str:
        """Create the system prompt from agent definition and skill manifests.

        Parameters
        ----------
        agent_def:
            Agent definition containing at least ``name``, ``description``,
            and optionally ``instructions``.
        skills:
            List of skill manifest dicts, each with ``name`` and ``description``.
        """
        parts: list[str] = []

        name = agent_def.get("name", "Assistant")
        description = agent_def.get("description", "")
        instructions = agent_def.get("instructions", "")

        parts.append(f"You are {name}.")
        if description:
            parts.append(description)
        if instructions:
            parts.append(f"\n## Instructions\n{instructions}")

        if skills:
            parts.append("\n## Available Skills")
            for skill in skills:
                skill_name = skill.get("name", "unknown")
                skill_desc = skill.get("description", "No description.")
                parts.append(f"- **{skill_name}**: {skill_desc}")

        return "\n".join(parts)

    @staticmethod
    def build_context(
        agent_def: dict[str, Any],
        skills: list[dict[str, Any]],
        memory: dict[str, Any] | None,
        conversation: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        """Return a complete message list ready for the LLM.

        Parameters
        ----------
        agent_def:
            Agent definition dict.
        skills:
            List of loaded skill manifests.
        memory:
            Kernel memory dict (scratchpad, recent turns) or None.
        conversation:
            List of ``{"role": ..., "content": ...}`` message dicts.
        """
        system_prompt = ContextBuilder.build_system_prompt(agent_def, skills)

        # Inject memory context into the system prompt when available.
        if memory:
            scratchpad = memory.get("scratchpad", "")
            if scratchpad:
                system_prompt += f"\n\n## Working Memory\n{scratchpad}"

        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

        # Append memory-supplied recent turns (if any) before the live conversation.
        if memory:
            recent_turns: list[dict[str, str]] = memory.get("recent_turns", [])
            messages.extend(recent_turns)

        messages.extend(conversation)
        return messages
