import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'ID of the agent to create a session for' })
  @IsString()
  agent_id!: string;

  @ApiProperty({ description: 'Input parameters for the session', required: false })
  @IsOptional()
  @IsObject()
  inputs?: Record<string, string>;
}
