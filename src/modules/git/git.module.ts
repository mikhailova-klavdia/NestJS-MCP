import { Module } from "@nestjs/common";
import { GitController } from "./git.controller";
import { GitService } from "./git.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmbedConfig } from "../../embedding-config";
import { CodeNodeExtractorService } from "../identifiers/code-node-constructor";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import { ProjectEntity } from "../project/project.entity";
import { GitProcessor } from "./processors/code-indexing.processor";
import { BullModule } from "@nestjs/bullmq";
import { EmbeddingProcessor } from "./processors/embedding.processor";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: "code-indexing" },
      { name: "code-embedding" }
    ),
    TypeOrmModule.forFeature([ProjectEntity, CodeNodeEntity]),
  ],
  controllers: [GitController],
  providers: [
    GitService,
    CodeNodeExtractorService,
    EmbedConfig,
    GitProcessor,
    EmbeddingProcessor,
  ],
  exports: [CodeNodeExtractorService, GitService],
})
export class GitModule {}
