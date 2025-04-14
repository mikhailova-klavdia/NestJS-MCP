import { Injectable } from '@nestjs/common';
import { EmbedConfig } from '../../embedding-config';
import { IdentifierService } from '../identifiers/identifier.service';

@Injectable()
export class RagService {
  constructor(
    private readonly _identifierService: IdentifierService,
    private readonly _embeddingService: EmbedConfig
  ) {}

  async retrieveAndGenerate(query: string): Promise<any> {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await this._embeddingService.embed(query);

    // Step 2: Retrieve relevant documents (you can implement a similarity search here)
    const identifiers = await this._identifierService.getAllIdentifiers();

    // Step 3: Find the most relevant document (simple cosine similarity for baseline)
    const relevantIdentifier = this._identifierService.findTop5RelevantIdentifiers(
      identifiers,
      queryEmbedding
    );

    return relevantIdentifier.map((doc) => ({
      title: doc.identifier.identifier,
      filePath: doc.identifier.filePath,
      similarity: doc.similarity,
      context: doc.identifier.context,
    }));
  }
}
