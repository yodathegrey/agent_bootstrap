import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MemoryPolicy {
  FULL = 'full',
  SUMMARY = 'summary',
  NONE = 'none',
}

export class CreateAgentDto {
  @ApiProperty({ description: 'Display name for the agent' })
  @IsString()
  @IsNotEmpty()
  display_name!: string;

  @ApiPropertyOptional({ description: 'Description of the agent purpose' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Ordered list of preferred model identifiers',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  model_preference!: string[];

  @ApiProperty({
    description: 'List of skill identifiers the agent can use',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @ApiPropertyOptional({
    description: 'Maximum conversation turns before auto-stop',
    default: 25,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  max_turns?: number = 25;

  @ApiPropertyOptional({
    description: 'Timeout in seconds for agent execution',
    default: 300,
  })
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(3600)
  timeout_seconds?: number = 300;

  @ApiPropertyOptional({
    description: 'Memory retention policy for the agent',
    enum: MemoryPolicy,
  })
  @IsEnum(MemoryPolicy)
  @IsOptional()
  memory_policy?: MemoryPolicy;

  @ApiPropertyOptional({
    description: 'Minimum RBAC role required to invoke this agent',
  })
  @IsString()
  @IsOptional()
  rbac_required_role?: string;

  @ApiPropertyOptional({
    description: 'Platform constraints for agent deployment',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platform_constraints?: string[];
}
