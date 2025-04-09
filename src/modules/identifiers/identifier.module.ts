import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingService } from 'src/modules/git/embedding.service';
import { SimilarityService } from 'src/modules/rag/similarity.service';
import { CodeNodeEntity } from './identifier.entity';
import { IdentifierService } from './identifier.service';
import { IdentifierExtractorService } from './identifier-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([CodeNodeEntity])],
  controllers: [],
  providers: [IdentifierService, EmbeddingService, SimilarityService, IdentifierExtractorService],
  exports: [IdentifierService, EmbeddingService, IdentifierExtractorService],
})
export class IdentifierModule {}
