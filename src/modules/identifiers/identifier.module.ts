import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbedConfig } from 'src/embedding-config';
import { CodeNodeEntity } from './entities/code-node.entity';
import { IdentifierService } from './identifier.service';
import { CodeNodeExtractor } from './code-node-constructor';

@Module({
  imports: [TypeOrmModule.forFeature([CodeNodeEntity])],
  controllers: [],
  providers: [IdentifierService, EmbedConfig, CodeNodeExtractor],
  exports: [IdentifierService, EmbedConfig, CodeNodeExtractor],
})
export class IdentifierModule {}
