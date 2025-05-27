import { IsString, IsOptional } from 'class-validator';

export class CloneDto {
  @IsString()
  repoUrl: string;

  @IsString()
  projectName: string;

  @IsOptional()
  @IsString()
  sshKey?: string;
}