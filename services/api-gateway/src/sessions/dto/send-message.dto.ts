import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content to send to the agent' })
  @IsString()
  content!: string;
}
