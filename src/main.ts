import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { CountryImporter } from './scripts/load-documents';
import { IdentifierImporter } from './scripts/load-identifiers-into-db';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json());

  //import all countries into the database
  /*
  const countryImporter = app.get(CountryImporter);
  try {
    const result = await countryImporter.importCountries();
    console.log('Country import completed:', result);
  } catch (error) {
    console.error('Failed to import countries:', error);
  }

  //importing all identiers for code base
  const identifierImporter = app.get(IdentifierImporter);
  try {
    const result = await identifierImporter.importIdentifiers();
    console.log('Identifier import completed:', result);
  } catch (error) {
    console.error('Failed to import identifier:', error);
  }*/

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
