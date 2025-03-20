import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingService } from '../embedding/embedding.service';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly _documentRepository: Repository<DocumentEntity>,
    private readonly _embeddingService: EmbeddingService,
  ) {}

  async getAllDocuments(): Promise<DocumentEntity[]> {
    const documents = await this._documentRepository.find();

    // ensure each document has an embedding
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
    return this._documentRepository.save(document);
  }
}
