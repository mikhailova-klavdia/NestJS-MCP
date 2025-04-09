import { Module } from '@nestjs/common';
import { GitController } from './git.controller';
import { GitService } from './git.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingService } from './embedding.service';
import { CodeNodeExtractorService } from '../identifiers/code-node-constructor';
import { CodeNodeEntity } from '../identifiers/code-node.entity';
import { ProjectEntity } from './project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, CodeNodeEntity])],
  controllers: [GitController],
  providers: [GitService, CodeNodeExtractorService, EmbeddingService],
  exports: [CodeNodeExtractorService, EmbeddingService],
})
export class GitModule {}
