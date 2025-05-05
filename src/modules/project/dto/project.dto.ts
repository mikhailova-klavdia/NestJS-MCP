import { IsString, IsOptional, IsUrl, isNumber, IsNumber } from 'class-validator';

export class ProjectDto {
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsUrl()
  readonly repoUrl?: string;

  @IsNumber()
  readonly webhookId: number;
}

