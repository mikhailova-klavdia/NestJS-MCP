import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmbedConfig } from "../../embedding-config";
import { CodeNodeEntity } from "./entities/code-node.entity";

@Injectable()
export class IdentifierService {
  constructor(
    @InjectRepository(CodeNodeEntity)
    private readonly _nodeRepo: Repository<CodeNodeEntity>,
    private readonly _embeddingService: EmbedConfig
  ) {}

  // find most relevant identifiers based on a query embedding
  async findTopNRelevantIdentifiers(
    projectId: number,
    queryEmbedding: number[],
    topN: number = 5
  ): Promise<{ node: CodeNodeEntity; score: number }[]> {
    // turning the query embedding into a string literal
    const qLiteral = JSON.stringify(queryEmbedding);

    const qb = this._nodeRepo
      .createQueryBuilder("node")
      .where("node.projectId = :pid", { pid: projectId })
      .addSelect(`node.embedding <#> :q::vector`, "distance")
      .orderBy("distance", "ASC")
      .limit(topN)
      .setParameter("q", qLiteral);

    const { entities, raw } = await qb.getRawAndEntities();
    return entities.map((node, i) => ({
      node,
      score: parseFloat(raw[i].distance),
    }));
  }

  // get identifiers by project ID and ensure embeddings are generated
  async getIdentifiersByProject(projectId: number): Promise<CodeNodeEntity[]> {
    const nodes = await this._nodeRepo.find({
      where: { project: { id: projectId } },
    });

    const nodesWithoutEmbedding = nodes.filter((n) => !n.embedding?.length);

    if (nodesWithoutEmbedding.length > 0) {
      const embeddings = await this._embeddingService.embedBatch(
        nodesWithoutEmbedding.map((n) => n.identifier)
      );

      for (let i = 0; i < nodesWithoutEmbedding.length; i++) {
        nodesWithoutEmbedding[i].embedding = embeddings[i];
      }

      await this._nodeRepo.save(nodesWithoutEmbedding);
    }

    return nodes;
  }
}
