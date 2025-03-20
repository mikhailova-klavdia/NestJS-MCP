// src/rag/rag.module.ts
import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { DocumentService } from '../document/document.service';
import { ChatService } from '../chat/chat.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../document/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  controllers: [RagController],
  providers: [RagService, DocumentService, ChatService, EmbeddingService],
})
export class RagModule {}
