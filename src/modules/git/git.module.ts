import { Module } from "@nestjs/common";
import { GitController } from "./git.controller";
import { GitService } from "./git.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmbedConfig } from "../../embedding-config";
import { CodeNodeExtractor } from "../identifiers/code-node-constructor";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import { ProjectEntity } from "../project/project.entity";
import { GitProcessor } from "./processors/code-indexing.processor";
import { BullModule } from "@nestjs/bullmq";
import { EmbeddingProcessor } from "./processors/embedding.processor";
import { CodeEdgeEntity } from "../identifiers/entities/code-edge.entity";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: "code-indexing" },
      { name: "code-embedding" },
      { name: "edge-save" }
    ),
    TypeOrmModule.forFeature([ProjectEntity, CodeNodeEntity, CodeEdgeEntity]),
  ],
  controllers: [GitController],
  providers: [
    GitService,
    CodeNodeExtractor,
    EmbedConfig,
    GitProcessor,
    EmbeddingProcessor,
  ],
  exports: [CodeNodeExtractor, GitService],
})
export class GitModule {}
