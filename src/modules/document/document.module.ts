import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './document.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { EmbeddingService } from 'src/modules/git/embedding.service';
import { SimilarityService } from 'src/modules/rag/similarity.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  controllers: [DocumentController],
  providers: [DocumentService, EmbeddingService, SimilarityService],
})
export class DocumentModule {}
