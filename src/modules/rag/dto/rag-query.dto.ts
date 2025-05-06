import { IsString, IsOptional, IsInt, Min, Max, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RagQueryDto {
  @IsString()
  query: string;

  @IsNumber()
  projectId: number;

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