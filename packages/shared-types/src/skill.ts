export type SkillRuntime = 'python' | 'node' | 'wasm';

export type SkillPlatform = 'linux' | 'macos' | 'windows';

export interface SkillManifest {
  skill_id: string;
  version: string;
  display_name: string;
  description: string;
  author: string;
  license: string;
  platforms: SkillPlatform[];
  runtime: SkillRuntime;
  entry_point: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  permissions: string[];
  dependencies: string[];
}
