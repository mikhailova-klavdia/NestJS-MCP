import { Injectable } from "@nestjs/common";
import { Tool, Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { RagService } from "src/modules/rag/rag.service";

@Injectable()
export class RagTool {
  constructor(private readonly _rag: RagService) {}

  @Tool({
    name: "rag",
    description: "RAG tool for retrieving related identifiers",
    parameters: z.object({
      query: z.string().nonempty(),
      projectId: z.string().uuid(),
      topN: z.number().int().positive().default(5),
      minSimilarity: z.number().min(0).max(1).default(0.0),
    }),
  })
  async retrieveRelatedIdentifiers(
    {
      query,
      projectId,
      topN,
      minSimilarity,
    }: {
      query: string;
      projectId: number;
      topN?: number;
      minSimilarity?: number;
    },
    context: Context
  ) {
    // run the RAG query
    const results = await this._rag.retrieveAndGenerate(
      query,
      projectId,
      topN,
      minSimilarity
    );

    // report progress
    const content = results.map((doc) => ({
      type: "text" as const,
      text: [
        `📄 **${doc.title}**`,
        `• similarity: ${doc.similarity.toFixed(3)}`,
        `• file: \`${doc.filePath}\``,
        `• context: ${doc.context.declarationType}`,
      ].join("\n"),
    }));

    return { content };
  }
}
