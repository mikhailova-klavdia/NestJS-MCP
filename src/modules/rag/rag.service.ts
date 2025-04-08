import { Injectable } from '@nestjs/common';
import { DocumentService } from '../document/document.service';
import { ChatService } from '../chat/chat.service';
import { EmbeddingService } from '../git/embedding.service';
import { DocumentEntity } from 'src/modules/document/document.entity';
import { title } from 'process';

@Injectable()
export class RagService {
  constructor(
    private readonly _documentService: DocumentService,
    private readonly _chatService: ChatService,
    private readonly _embeddingService: EmbeddingService
  ) {}

  async retrieveAndGenerate(query: string): Promise<any> {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await this._embeddingService.embed(query);

    // Step 2: Retrieve relevant documents (you can implement a similarity search here)
    const documents = await this._documentService.getAllDocuments();

    // Step 3: Find the most relevant document (simple cosine similarity for baseline)
    const relevantDocuments = this._documentService.findMostRelevantDocuments(
      documents,
      queryEmbedding
    );

    return relevantDocuments.map((doc) => ({
      title: doc.document.title,
      similarity: doc.similarity,
    }));
  }
}
