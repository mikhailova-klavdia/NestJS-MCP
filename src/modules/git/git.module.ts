import { Module } from '@nestjs/common';
import { GitController } from './git.controller';
import { GitService } from './git.service';
import { IdentifierExtractorService } from './identifier-extractor.service';
import { ProjectEntity } from './project.entity';
import { IdentifierEntity } from './identifier.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, IdentifierEntity])],
  controllers: [GitController],
  providers: [GitService, IdentifierExtractorService],
  exports: [IdentifierExtractorService],
})
export class GitModule {}
