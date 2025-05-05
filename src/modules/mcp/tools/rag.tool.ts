import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { RagService } from 'src/modules/rag/rag.service';

@Injectable()
export class GreetingTool {
  constructor(private readonly _rag: RagService) {}

  @Tool({
    name: 'rag',
    description: "RAG tool for retrieving related identifiers",
  })
  async retrieveRelatedIdentifiers(
    { name },
  ) {
    // 1. Run your RAG query
    const results = await this._rag.retrieveAndGenerate(name);

    // 2. Format each result as a text block
    const content = results.map((doc) => ({
      type: 'text' as const,
      text: [
        `📄 **${doc.title}**`,
        `• similarity: ${doc.similarity.toFixed(3)}`,
        `• file: \`${doc.filePath}\``,
        `• context: ${doc.context.declarationType}`,
      ].join('\n'),
    }));

    // 3. Return the MCP‐compatible payload
    return { content };
  }
}