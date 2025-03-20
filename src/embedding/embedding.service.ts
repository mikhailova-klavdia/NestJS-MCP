import { Injectable } from '@nestjs/common';
import { OllamaEmbeddings } from '@langchain/ollama';

@Injectable()
export class EmbeddingService {
  private embeddings: OllamaEmbeddings;

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: process.env.MODEL_NAME,
      baseUrl: process.env.OLLAMA_HOST,
    });
  }

  async embed(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }
}
