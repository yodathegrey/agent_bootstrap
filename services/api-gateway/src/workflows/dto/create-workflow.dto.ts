import { IsString, IsArray, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class WorkflowStepDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsString() agent!: string;
  @ApiProperty({ required: false }) @IsOptional() inputs?: Record<string, string>;
  @ApiProperty({ required: false }) @IsOptional() @IsArray() depends_on?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() parallel_with?: string;
}

export class CreateWorkflowDto {
  @ApiProperty() @IsString() display_name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ['manual', 'api', 'schedule'] })
  @IsEnum(['manual', 'api', 'schedule'])
  trigger!: string;
  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
}

export class RunWorkflowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  inputs?: Record<string, string>;
}
