import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as semver from 'semver';
import { RegisterSkillDto } from './dto/register-skill.dto';

export interface StoredSkill extends RegisterSkillDto {
  org_id: string;
  registered_at: string;
  updated_at: string;
}

export interface ResolveResult {
  resolved: StoredSkill[];
  unresolved: string[];
}

@Injectable()
export class SkillsService {
  private skills: Map<string, StoredSkill[]> = new Map();

  registerSkill(manifest: RegisterSkillDto, orgId: string): StoredSkill {
    this.validateManifest(manifest);

    const key = `${orgId}:${manifest.skill_id}`;
    const existing = this.skills.get(key) || [];

    const duplicate = existing.find((s) => s.version === manifest.version);
    if (duplicate) {
      throw new ConflictException(
        `Skill "${manifest.skill_id}" version "${manifest.version}" is already registered`,
      );
    }

    const now = new Date().toISOString();
    const stored: StoredSkill = {
      ...manifest,
      org_id: orgId,
      registered_at: now,
      updated_at: now,
    };

    existing.push(stored);
    this.skills.set(key, existing);

    return stored;
  }

  listSkills(
    orgId: string,
    filters?: { platform?: string; runtime?: string },
  ): StoredSkill[] {
    const results: StoredSkill[] = [];

    for (const [key, versions] of this.skills.entries()) {
      if (!key.startsWith(`${orgId}:`)) continue;

      // Return the latest version of each skill
      const latest = this.getLatestVersion(versions);
      if (!latest) continue;

      if (filters?.platform && !latest.platforms.includes(filters.platform)) {
        continue;
      }
      if (filters?.runtime && latest.runtime !== filters.runtime) {
        continue;
      }

      results.push(latest);
    }

    return results;
  }

  getSkill(skillId: string, orgId: string, version?: string): StoredSkill {
    const key = `${orgId}:${skillId}`;
    const versions = this.skills.get(key);

    if (!versions || versions.length === 0) {
      throw new NotFoundException(`Skill "${skillId}" not found`);
    }

    if (version) {
      const specific = versions.find((s) => s.version === version);
      if (!specific) {
        throw new NotFoundException(
          `Skill "${skillId}" version "${version}" not found`,
        );
      }
      return specific;
    }

    return this.getLatestVersion(versions)!;
  }

  getSkillVersions(skillId: string, orgId: string): StoredSkill[] {
    const key = `${orgId}:${skillId}`;
    const versions = this.skills.get(key);

    if (!versions || versions.length === 0) {
      throw new NotFoundException(`Skill "${skillId}" not found`);
    }

    return [...versions].sort((a, b) =>
      semver.rcompare(a.version, b.version),
    );
  }

  resolveSkills(skillIds: string[], platform?: string): ResolveResult {
    const resolved: StoredSkill[] = [];
    const unresolved: string[] = [];

    for (const skillId of skillIds) {
      let found: StoredSkill | null = null;

      // Search across all orgs for resolution (internal endpoint)
      for (const [, versions] of this.skills.entries()) {
        const match = versions.find((s) => s.skill_id === skillId);
        if (match) {
          const latest = this.getLatestVersion(versions)!;
          if (platform && !latest.platforms.includes(platform)) {
            continue;
          }
          found = latest;
          break;
        }
      }

      if (found) {
        resolved.push(found);
      } else {
        unresolved.push(skillId);
      }
    }

    return { resolved, unresolved };
  }

  uninstallSkill(skillId: string, orgId: string): void {
    const key = `${orgId}:${skillId}`;
    const versions = this.skills.get(key);

    if (!versions || versions.length === 0) {
      throw new NotFoundException(`Skill "${skillId}" not found`);
    }

    this.skills.delete(key);
  }

  validateManifest(manifest: RegisterSkillDto): void {
    if (!manifest.skill_id || manifest.skill_id.trim() === '') {
      throw new BadRequestException('skill_id is required');
    }

    if (!manifest.version || !semver.valid(manifest.version)) {
      throw new BadRequestException(
        `Invalid version "${manifest.version}" - must be valid semver`,
      );
    }

    if (!manifest.entry_point || manifest.entry_point.trim() === '') {
      throw new BadRequestException('entry_point is required');
    }

    if (!manifest.input_schema || typeof manifest.input_schema !== 'object') {
      throw new BadRequestException('input_schema is required and must be an object');
    }

    if (!manifest.output_schema || typeof manifest.output_schema !== 'object') {
      throw new BadRequestException('output_schema is required and must be an object');
    }
  }

  private getLatestVersion(versions: StoredSkill[]): StoredSkill | null {
    if (versions.length === 0) return null;

    return versions.reduce((latest, current) =>
      semver.gt(current.version, latest.version) ? current : latest,
    );
  }
}
