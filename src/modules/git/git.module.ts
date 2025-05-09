import { Module } from "@nestjs/common";
import { GitController } from "./git.controller";
import { GitService } from "./git.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmbedConfig } from "../../embedding-config";
import { CodeNodeExtractor } from "../identifiers/code-node-constructor";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import { ProjectEntity } from "../project/project.entity";
import { BullModule } from "@nestjs/bullmq";
import { EmbeddingProcessor } from "./processors/embedding.processor";
import { CodeEdgeEntity } from "../identifiers/entities/code-edge.entity";
import { EdgeSaveProcessor } from "./processors/save-edge.processor";
import { GitProcessor } from "./processors/git.processor";

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
    EdgeSaveProcessor,
  ],
  exports: [CodeNodeExtractor, GitService],
})
export class GitModule {}
