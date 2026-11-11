import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreatePageDto {
  @ApiProperty({
    format: 'uri',
    example: 'https://news.ycombinator.com',
    description: 'HTTP or HTTPS URL of a publicly reachable page',
  })
  @IsNotEmpty()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url!: string;
}
