import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { DocumentService } from '../document/document.service';
import { ChatService } from '../chat/chat.service';
import { EmbeddingService } from '../git/embedding.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../document/document.entity';
import { SimilarityService } from './similarity.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  controllers: [RagController],
  providers: [
    RagService, 
    DocumentService, 
    ChatService, 
    EmbeddingService,
    SimilarityService,
  ],
  exports: [
    SimilarityService,
  ]
})
export class RagModule {}
