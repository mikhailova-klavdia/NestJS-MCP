import { Module } from '@nestjs/common';
import { GitController } from './git.controller';
import { GitService } from './git.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingService } from './embedding.service';
import { IdentifierExtractorService } from '../identifiers/identifier-extractor.service';
import { IdentifierEntity } from '../identifiers/identifier.entity';
import { ProjectEntity } from './project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, IdentifierEntity])],
  controllers: [GitController],
  providers: [GitService, IdentifierExtractorService, EmbeddingService],
  exports: [IdentifierExtractorService, EmbeddingService],
})
export class GitModule {}
