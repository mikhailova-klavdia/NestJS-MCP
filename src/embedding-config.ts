import { OllamaEmbeddings } from '@langchain/ollama';

export class EmbedConfig {
  private embeddings: OllamaEmbeddings;

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: process.env.MODEL_NAME,
      baseUrl: process.env.OLLAMA_HOST,
    });
  }

  async embed(text: string): Promise<number[]> {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }
    return this.embeddings.embedQuery(text);
  }
}
