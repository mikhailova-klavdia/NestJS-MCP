import {
  IsString,
  IsOptional,
  IsUrl,
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

  @IsString()
  localPath?: string;
}
