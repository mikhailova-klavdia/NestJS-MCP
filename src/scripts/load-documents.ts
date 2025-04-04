import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentEntity } from 'src/modules/document/document.entity';
import { EmbeddingService } from 'src/modules/embedding/embedding.service';

@Injectable()
export class CountryImporter {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly _documentRepository: Repository<DocumentEntity>,
    private readonly _embeddingService: EmbeddingService
  ) {}

  async importCountries() {
    try {
      //clear the database
      await this._documentRepository.delete({});
      console.log('Database cleared successfully');

      //loading data from the database
      const jsonPath = path.join('documents/country-by-capital-city.json');
      const countriesData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      const documentsToSave: DocumentEntity[] = [];

      for (const item of countriesData) {
        if (item.country && item.city) {
          const doc = new DocumentEntity();
          doc.title = item.country;
          doc.content = `${item.city} is the capital of ${item.country}`;
          doc.embedding = await this._embeddingService.embed(doc.content);

          documentsToSave.push(doc);
        }
      }

      // Save all documents in a single transaction
      await this._documentRepository.save(documentsToSave);

      return { success: true, count: documentsToSave.length };
    } catch (err) {
      console.error('Error during country import:', err);
      throw err;
    }
  }
}
