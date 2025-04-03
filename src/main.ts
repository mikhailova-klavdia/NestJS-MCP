import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { CountryImporter } from './scripts/load-documents';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json());

  //import all countries into the database
  const countryImporter = app.get(CountryImporter);
  try {
    const result = await countryImporter.importCountries();
    console.log('Country import completed:', result);
  } catch (error) {
    console.error('Failed to import countries:', error);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
