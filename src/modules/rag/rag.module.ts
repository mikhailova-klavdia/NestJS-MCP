import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { EmbedConfig } from '../../embedding-config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimilarityService } from './similarity.service';
import { CodeNodeEntity } from '../identifiers/code-node.entity';
import { IdentifierModule } from '../identifiers/identifier.module';

@Module({
  imports: [TypeOrmModule.forFeature([CodeNodeEntity]), IdentifierModule],
  controllers: [RagController],
  providers: [RagService, EmbedConfig, SimilarityService],
  exports: [SimilarityService],
})
export class RagModule {}
