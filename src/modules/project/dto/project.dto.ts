import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
} from "class-validator";

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

  @IsString()
  webhookSecret?: string;

  @IsString()
  localPath?: string;
}
