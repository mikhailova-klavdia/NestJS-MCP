import { IsString, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RagQueryDto {
  @IsString()
  query: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  topN?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minSimilarity?: number;
}