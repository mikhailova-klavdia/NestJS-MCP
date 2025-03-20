// src/rag/rag.service.ts
import { Injectable } from '@nestjs/common';
import { DocumentService } from '../document/document.service';
import { ChatService } from '../chat/chat.service';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class RagService {
  constructor(
    private readonly _documentService: DocumentService,
    private readonly _chatService: ChatService,
    private readonly _embeddingService: EmbeddingService,
  ) {}

  async retrieveAndGenerate(query: string): Promise<string> {
    // Step 1: Generate embedding for the query
    console.log('embedding');
    const queryEmbedding = await this._embeddingService.embed(query);

    // Step 2: Retrieve relevant documents (you can implement a similarity search here)
    console.log('retrieve documents');
    const documents = await this._documentService.getAllDocuments();

    // Step 3: Find the most relevant document (simple cosine similarity for baseline)
    console.log('searching for similar docs');
    const relevantDocument = this.findMostRelevantDocument(
      documents,
      queryEmbedding,
    );

    // Step 4: Generate a response using the relevant document and the query
    console.log('ask ollama');
    const response = await this._chatService.askOllama(
      `Based on the following document, answer the question: ${query}\n\nDocument: ${relevantDocument.content}`,
    );

    return response;
  }

  private findMostRelevantDocument(
    documents: any[],
    queryEmbedding: number[],
  ): any {
    let maxSimilarity = -1;
    let relevantDocument = null;

    for (const doc of documents) {
      if (doc.embedding) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          relevantDocument = doc;
        }
      }
    }

    return relevantDocument;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
