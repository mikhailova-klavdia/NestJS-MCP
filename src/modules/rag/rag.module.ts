import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { ChatService } from '../chat/chat.service';
import { EmbeddingService } from '../git/embedding.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimilarityService } from './similarity.service';
import { IdentifierEntity } from '../identifiers/identifier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IdentifierEntity])],
  controllers: [RagController],
  providers: [RagService, ChatService, EmbeddingService, SimilarityService],
  exports: [SimilarityService],
})
export class RagModule {}
