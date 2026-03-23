import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsIn,
  IsObject,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterSkillDto {
  @ApiProperty({ description: 'Unique skill identifier', example: 'code-review' })
  @IsString()
  @IsNotEmpty()
  skill_id!: string;

  @ApiProperty({ description: 'Semantic version', example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ description: 'Human-readable name', example: 'Code Review' })
  @IsString()
  @IsNotEmpty()
  display_name!: string;

  @ApiProperty({ description: 'Skill description', example: 'Automated code review skill' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Skill author', example: 'nexus-team' })
  @IsString()
  @IsNotEmpty()
  author!: string;

  @ApiProperty({ description: 'License identifier', example: 'MIT' })
  @IsString()
  @IsNotEmpty()
  license!: string;

  @ApiProperty({ description: 'Supported platforms', example: ['linux/amd64', 'darwin/arm64'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  platforms!: string[];

  @ApiProperty({ description: 'Runtime environment', enum: ['python', 'node', 'wasm'] })
  @IsString()
  @IsIn(['python', 'node', 'wasm'])
  runtime!: string;

  @ApiProperty({ description: 'Entry point for execution', example: 'main.py' })
  @IsString()
  @IsNotEmpty()
  entry_point!: string;

  @ApiProperty({ description: 'JSON schema for skill inputs', example: { type: 'object', properties: {} } })
  @IsObject()
  input_schema!: Record<string, unknown>;

  @ApiProperty({ description: 'JSON schema for skill outputs', example: { type: 'object', properties: {} } })
  @IsObject()
  output_schema!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Required permissions', example: ['file:read', 'net:http'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Skill dependencies', example: ['utils@^1.0.0'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}
