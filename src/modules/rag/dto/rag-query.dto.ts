import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

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
  depth?: number;
}
