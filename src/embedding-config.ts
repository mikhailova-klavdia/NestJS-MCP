import { OllamaEmbeddings } from "@langchain/ollama";
import { Logger } from "@nestjs/common";

export class EmbedConfig {
  private _embeddings: OllamaEmbeddings;
  public isConnected = false;
  private readonly _logger = new Logger(EmbedConfig.name);

  constructor() {
    this._embeddings = new OllamaEmbeddings({
      model: process.env.MODEL_NAME,
      baseUrl: process.env.OLLAMA_HOST,
    });
  }

  async onModuleInit() {
    try {
      await this._embeddings.embedQuery("healthcheck");
      this.isConnected = true;
      this._logger.log(`✅ Connected to Ollama at ${process.env.OLLAMA_HOST}`);
    } catch (err: any) {
      this.isConnected = false;
      this._logger.error(
        `❌ Cannot connect to Ollama at ${process.env.OLLAMA_HOST}: ${err.message}`
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!text || typeof text !== "string") {
      throw new Error("Invalid input: text must be a non-empty string");
    }
    return this._embeddings.embedQuery(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.some((t) => typeof t !== "string")) {
      throw new Error("Invalid input: texts must be an array of strings");
    }
    return this._embeddings.embedDocuments(texts);
  }
}
