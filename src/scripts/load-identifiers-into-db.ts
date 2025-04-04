import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocumentEntity } from "src/modules/document/document.entity";
import { EmbeddingService } from "src/modules/embedding/embedding.service";
import { IdentifierExtractorService } from "src/modules/identifiers/identifier-extractor.service";

@Injectable()
export class IdentifierImporter {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly _documentRepository: Repository<DocumentEntity>,
    private readonly _embeddingService: EmbeddingService,
    private readonly _identifierExtractorService: IdentifierExtractorService
  ) {}

  async importIdentifiers() {
    try {
      // Clear the database
      await this._documentRepository.delete({});
      console.log("Database cleared successfully");

      // Extract identifier names
      const filePath = "documents/code_base";
      const identifiers = this._identifierExtractorService.getIdentifiersFromFolder(filePath);

      const documentsToSave: DocumentEntity[] = [];

      for (const identifier of identifiers) {
        if (identifier.name) {
          const doc = new DocumentEntity();
          doc.title = identifier.name;
          doc.content = `Identifier "${identifier.name}" found in the code base.`;
          doc.embedding = await this._embeddingService.embed(doc.content);

          documentsToSave.push(doc);
        }
      }

      await this._documentRepository.save(documentsToSave);
      return { success: true, count: documentsToSave.length };
    } catch (err) {
      console.error("Error during identifier import:", err);
      throw err;
    }
  }
}
