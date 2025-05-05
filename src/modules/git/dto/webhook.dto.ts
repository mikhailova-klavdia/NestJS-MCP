import { IsString, IsUrl, IsOptional, IsArray } from 'class-validator';

export class WebhookDto {
  @IsUrl()
  readonly callbackUrl: string;

  @IsOptional()
  @IsString()
  readonly secret?: string;

  @IsOptional()
  @IsArray()
  readonly events?: string[];
}
