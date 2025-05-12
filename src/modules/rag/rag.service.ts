import { Injectable, Logger } from "@nestjs/common";
import { EmbedConfig } from "../../embedding-config";
import { IdentifierService } from "../identifiers/identifier.service";

@Injectable()
export class RagService {
  private readonly _logger = new Logger(RagService.name);
  constructor(
    private readonly _identifierService: IdentifierService,
    private readonly _embeddingConfig: EmbedConfig
  ) {}

  async retrieve(
    query: string,
    projectId: number,
    topN: number = 5,
    minSimilarity: number = 0.0
  ): Promise<any> {
    const startTime = process.hrtime();

    // Step 1: Generate embedding for the query
    const queryEmbedding = await this._embeddingConfig.embed(query);

    // Step 2: Retrieve relevant documents (you can implement a similarity search here)
    const identifiers =
      await this._identifierService.getIdentifiersByProject(projectId);

    // Step 3: Find the most relevant document (simple cosine similarity for baseline)
    const relevantIdentifier =
      this._identifierService.findTopNRelevantIdentifiers(
        identifiers,
        queryEmbedding,
        topN
      );

    const results = relevantIdentifier
      .filter((r) => r.similarity >= minSimilarity)
      .map((doc) => ({
        title: doc.identifier.identifier,
        filePath: doc.identifier.filePath,
        declarationType: doc.identifier.context.declarationType,
        similarity: doc.similarity,
        context: doc.identifier.context,
      }));

    const [sec, ns] = process.hrtime(startTime);
    const elapsedMs = sec * 1e3 + ns / 1e6;
    this._logger.log(`retrieveAndGenerate latency: ${elapsedMs.toFixed(2)}ms`);

    return { time: elapsedMs, results };
  }
}
