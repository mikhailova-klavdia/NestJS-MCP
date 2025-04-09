import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { EmbeddingService } from '../git/embedding.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimilarityService } from './similarity.service';
import { CodeNodeEntity } from '../identifiers/identifier.entity';
import { IdentifierModule } from '../identifiers/identifier.module';

@Module({
  imports: [TypeOrmModule.forFeature([CodeNodeEntity]), IdentifierModule],
  controllers: [RagController],
  providers: [RagService, EmbeddingService, SimilarityService],
  exports: [SimilarityService],
})
export class RagModule {}
