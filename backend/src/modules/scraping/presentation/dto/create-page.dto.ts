import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreatePageDto {
  @IsNotEmpty()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url!: string;
}
