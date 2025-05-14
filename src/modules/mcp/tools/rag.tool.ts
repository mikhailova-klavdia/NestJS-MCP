import { Injectable, Logger } from "@nestjs/common";
import { Tool, Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { RagService } from "src/modules/rag/rag.service";

@Injectable()
export class RagTool {
  private readonly _logger = new Logger(RagTool.name);

  constructor(private readonly _rag: RagService) {}

  @Tool({
    name: "rag",
    description: "RAG tool for retrieving related identifiers",
    parameters: z.object({
      query: z.string().nonempty(),
      projectId: z.string().uuid(),
      topN: z.number().int().positive().default(5),
      minSimilarity: z.number().min(0).max(1).default(0.0),
      depth: z.number().int().min(0).default(0),
    }),
  })
  async retrieveRelatedIdentifiers({
    query,
    projectId,
    topN,
    minSimilarity,
    depth,
  }: {
    query: string;
    projectId: number;
    topN?: number;
    minSimilarity?: number;
    depth?: number;
  }) {
    this._logger.log(
      `Running RAG query for project=${projectId}, topN=${topN}, minSimilarity=${minSimilarity}, depth=${depth}`
    );

    // run the RAG query
    const results = await this._rag.retrieve(
      query,
      projectId,
      topN,
      minSimilarity,
      depth
    );

    // report progress
    return { results };
  }
}
