import { Module } from "@nestjs/common";
import { RagService } from "./rag.service";
import { RagController } from "./rag.controller";
import { EmbedConfig } from "../../embedding-config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import { IdentifierModule } from "../identifiers/identifier.module";
import { CodeEdgeEntity } from "../identifiers/entities/code-edge.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([CodeNodeEntity, CodeEdgeEntity]),
    IdentifierModule,
  ],
  controllers: [RagController],
  providers: [RagService, EmbedConfig],
  exports: [RagService],
})
export class RagModule {}
