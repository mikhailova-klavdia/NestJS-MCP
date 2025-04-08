import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingService } from 'src/modules/git/embedding.service';
import { SimilarityService } from 'src/modules/rag/similarity.service';
import { IdentifierEntity } from './identifier.entity';
import { IdentifierService } from './identifier.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdentifierEntity])],
  controllers: [],
  providers: [IdentifierService, EmbeddingService, SimilarityService],
})
export class identifierModule {}
