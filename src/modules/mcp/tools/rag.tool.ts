import { Injectable, Logger } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import { z } from "zod";
import { RagService } from "src/modules/rag/rag.service";

@Injectable()
export class RagTool {
  private readonly _logger = new Logger(RagTool.name);

  constructor(private readonly _rag: RagService) {}

  @Tool({
    name: "rag",
    description:
      "RAG tool for retrieving related identifiers and their graph structure",
    parameters: z.object({
      query: z.string().nonempty(),
      projectId: z.number().int().positive(),
      topN: z.number().int().positive().default(5),
      depth: z.number().int().min(0).default(0),
    }),
  })
  async retrieveRelatedIdentifiers(params: {
    query: string;
    projectId: number;
    topN?: number;
    depth?: number;
  }) {
    const { query, projectId, topN, depth } = params;
    this._logger.log(
      `Running RAG query for project=${projectId}, topN=${topN}, depth=${depth}`
    );

    // Retrieve the subgraph payloads
    const payload = await this._rag.retrieve(query, projectId, topN, depth);

    // Stringify the full results payload for inspection
    const jsonText = JSON.stringify(payload, null, 2);

    const content = [
      {
        type: "text" as const,
        text: jsonText,
      },
    ];

    return { content };
  }
}
