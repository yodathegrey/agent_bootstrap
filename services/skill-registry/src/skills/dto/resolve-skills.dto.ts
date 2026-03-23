import { IsArray, IsString, ArrayNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveSkillsDto {
  @ApiProperty({ description: 'List of skill IDs to resolve', example: ['code-review', 'linter'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  skill_ids!: string[];

  @ApiPropertyOptional({ description: 'Target platform for resolution', example: 'linux/amd64' })
  @IsOptional()
  @IsString()
  target_platform?: string;
}
