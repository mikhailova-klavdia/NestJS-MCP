import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbedConfig } from 'src/embedding-config';
import { CodeNodeEntity } from './code-node.entity';
import { IdentifierService } from './identifier.service';
import { CodeNodeExtractorService } from './code-node-constructor';

@Module({
  imports: [TypeOrmModule.forFeature([CodeNodeEntity])],
  controllers: [],
  providers: [IdentifierService, EmbedConfig, CodeNodeExtractorService],
  exports: [IdentifierService, EmbedConfig, CodeNodeExtractorService],
})
export class IdentifierModule {}
