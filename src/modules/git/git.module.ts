import { Module } from '@nestjs/common';
import { GitController } from './git.controller';
import { GitService } from './git.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbedConfig } from '../../embedding-config';
import { CodeNodeExtractorService } from '../identifiers/code-node-constructor';
import { CodeNodeEntity } from '../identifiers/code-node.entity';
import { ProjectEntity } from './project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, CodeNodeEntity])],
  controllers: [GitController],
  providers: [GitService, CodeNodeExtractorService, EmbedConfig],
  exports: [CodeNodeExtractorService, GitService],
})
export class GitModule {}
