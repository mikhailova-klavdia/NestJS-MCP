import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeUrl } from 'src/utils/url-normalizer';

export class CloneDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @Transform(({ value }) => normalizeUrl(value), { toClassOnly: true })
  repoUrl: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;

  @IsString()
  @IsOptional()
  sshKey?: string;
}
