import { Injectable } from "@nestjs/common";
import { EmbedConfig } from "../../embedding-config";
import { IdentifierService } from "../identifiers/identifier.service";

@Injectable()
export class RagService {
  constructor(
    private readonly _identifierService: IdentifierService,
    private readonly _embeddingConfig: EmbedConfig
  ) {}

  async retrieveAndGenerate(
    query: string,
    projectId: number,
    topN: number = 5,
    minSimilarity: number = 0.0
  ): Promise<any> {
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

    return relevantIdentifier
      .filter((r) => r.similarity >= minSimilarity)
      .map((doc) => ({
        title: doc.identifier.identifier,
        filePath: doc.identifier.filePath,
        similarity: doc.similarity,
        context: doc.identifier.context,
      }));
  }
}
