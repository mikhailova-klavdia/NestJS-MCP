import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { RagService } from "./rag.service";
import { RagQueryDto } from "./dto/rag-query.dto";

@Controller("rag")
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post("query")
  async query(@Body() dto: RagQueryDto) {
    const { query, projectId, topN = 5, minSimilarity = 0.0, depth = 0 } = dto;

    if (!query || !projectId) {
      throw new BadRequestException(
        "Both `query` and `projectId` are required"
      );
    }

    return this.ragService.retrieve(query, projectId, topN, minSimilarity, depth);
  }
}
