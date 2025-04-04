import { Injectable, Logger } from '@nestjs/common';
import { OllamaEmbeddings } from '@langchain/ollama';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private embeddings: OllamaEmbeddings;

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: process.env.MODEL_NAME,
      baseUrl: process.env.OLLAMA_HOST,
    });
  }

  async embed(text: string): Promise<number[]> {
    //this.logger.log(`Embedding text: ${text}`);
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }
    return this.embeddings.embedQuery(text);
  }
}
