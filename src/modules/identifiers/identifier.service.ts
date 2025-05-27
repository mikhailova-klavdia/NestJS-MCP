import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmbedConfig } from "../../embedding-config";
import { cosineSimilarity } from "src/utils/similarity.util";
import { CodeNodeEntity } from "./entities/code-node.entity";

@Injectable()
export class IdentifierService {
  constructor(
    @InjectRepository(CodeNodeEntity)
    private readonly _identifierRepository: Repository<CodeNodeEntity>,
    private readonly _embeddingService: EmbedConfig
  ) {}

  // find most relevant identifiers based on a query embedding
  findTopNRelevantIdentifiers(
    identifiers: CodeNodeEntity[],
    queryEmbedding: number[],
    n: number = 5
  ): { identifier: CodeNodeEntity; similarity: number }[] {
    const relevant: { identifier: CodeNodeEntity; similarity: number }[] = [];

    for (const ident of identifiers) {
      if (!ident.embedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, ident.embedding);

      if (relevant.length < n) {
        relevant.push({ identifier: ident, similarity });
        relevant.sort((a, b) => a.similarity - b.similarity);
        continue;
      }

      if (similarity > relevant[0].similarity) {
        relevant[0] = { identifier: ident, similarity };
        relevant.sort((a, b) => a.similarity - b.similarity);
      }
    }

    return relevant.sort((a, b) => b.similarity - a.similarity);
  }

  // get identifiers by project ID and ensure embeddings are generated
  async getIdentifiersByProject(projectId: number): Promise<CodeNodeEntity[]> {
    const nodes = await this._identifierRepository.find({
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

      await this._identifierRepository.save(nodesWithoutEmbedding);
    }

    return nodes;
  }
}
