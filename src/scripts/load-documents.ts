import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentEntity } from 'src/document/document.entity';
import { EmbeddingService } from 'src/embedding/embedding.service';

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

      //saving the data
      const documentsToSave = countriesData.map(async (item: any) => {
        const capital = item.city || 'No capital specified';

        const doc = new DocumentEntity();
        doc.title = item.country;
        doc.content = `${capital} is the capital of ${item.country}`;
        doc.embedding = await this._embeddingService.embed(doc.content);

        return doc;
      });

      await this._documentRepository.save(documentsToSave);
      console.log(`${documentsToSave.length} countries saved successfully`);

      return { success: true, count: documentsToSave.length };
    } catch (err) {
      console.error('Error during country import:', err);
      throw err;
    }
  }
}
