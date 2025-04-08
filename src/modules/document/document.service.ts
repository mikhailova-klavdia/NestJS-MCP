import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingService } from '../git/embedding.service';
import { DocumentEntity } from './document.entity';
import { SimilarityService } from 'src/modules/rag/similarity.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly _documentRepository: Repository<DocumentEntity>,
    private readonly _embeddingService: EmbeddingService,
    private readonly _similarityService: SimilarityService
  ) {}

  async getAllDocuments(): Promise<DocumentEntity[]> {
    const documents = await this._documentRepository.find();

    // ensure each document has an embedding
    // TODO Mode to creation
    for (const doc of documents) {
      if (!doc.embedding) {
        doc.embedding = await this._embeddingService.embed(doc.content);
        await this._documentRepository.save(doc);
      }
    }
    return documents;
  }

  async saveDocument(title: string, content: string): Promise<DocumentEntity> {
    const document = new DocumentEntity();
    document.title = title;
    document.content = content;
    document.embedding = await this._embeddingService.embed(document.content);
    return this._documentRepository.save(document);
  }

  findMostRelevantDocument(
    documents: DocumentEntity[],
    queryEmbedding: number[]
  ): DocumentEntity | null {
    let maxSimilarity = -1;
    let relevantDocument: DocumentEntity | null = null;

    for (const doc of documents) {
      if (doc.embedding) {
        const similarity = this._similarityService.cosineSimilarity(queryEmbedding, doc.embedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          relevantDocument = doc;
        }
      }
    }

    console.log(relevantDocument);
    return relevantDocument;
  }

  // find 5 relevant documents
  findMostRelevantDocuments(documents: DocumentEntity[], queryEmbedding: number[]): any {
    const relevantDocuments: {
      document: DocumentEntity;
      similarity: number;
    }[] = [];

    for (const doc of documents) {
      if (!doc.embedding) continue;

      const similarity = this._similarityService.cosineSimilarity(queryEmbedding, doc.embedding);

      if (relevantDocuments.length < 5) {
        relevantDocuments.push({ document: doc, similarity });
        relevantDocuments.sort((a, b) => a.similarity - b.similarity);
        continue;
      }

      if (similarity > relevantDocuments[0].similarity) {
        relevantDocuments[0] = { document: doc, similarity };
        relevantDocuments.sort((a, b) => a.similarity - b.similarity);
      }
    }

    return relevantDocuments.sort((a, b) => b.similarity - a.similarity);
  }
}
