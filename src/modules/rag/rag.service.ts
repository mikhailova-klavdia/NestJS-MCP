import { Injectable, Logger } from "@nestjs/common";
import { EmbedConfig } from "../../embedding-config";
import { IdentifierService } from "../identifiers/identifier.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CodeEdgeEntity } from "../identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import {
  ContextV1,
  GraphNeighbor,
  GraphNodePayload,
  RelationshipType,
} from "src/utils/types";

@Injectable()
export class RagService {
  private readonly _logger = new Logger(RagService.name);
  constructor(
    private readonly _identifierService: IdentifierService,

    private readonly _embeddingConfig: EmbedConfig,

    @InjectRepository(CodeEdgeEntity)
    private readonly _edgeRepo: Repository<CodeEdgeEntity>,

    @InjectRepository(CodeNodeEntity)
    private readonly _nodeRepo: Repository<CodeNodeEntity>
  ) {}

  async retrieve(
    query: string,
    projectId: number,
    topN: number = 5,
    minSimilarity: number = 0.0,
    depth: number = 0
  ): Promise<any> {
    const startTime = process.hrtime();

    // Step 1: Generate embedding for the query
    const queryEmbedding = await this._embeddingConfig.embed(query);

    // Step 2: Retrieve relevant documents (you can implement a similarity search here)
    const identifiers =
      await this._identifierService.getIdentifiersByProject(projectId);

    // Step 3: Find the most relevant document (simple cosine similarity for baseline)
    const relevantIdentifier = this._identifierService
      .findTopNRelevantIdentifiers(identifiers, queryEmbedding, topN)
      .filter((hit) => hit.similarity >= minSimilarity);

    const visited = new Set<string>();
    const results: GraphNodePayload[] = [];

    for (const hit of relevantIdentifier) {
      const nodeId = hit.identifier.id;
      const subgraph = await this.buildGraph(nodeId, depth, visited);
      if (subgraph) {
        subgraph.similarity = hit.similarity;
        results.push(subgraph);
      }
    }

    const [sec, ns] = process.hrtime(startTime);
    const elapsedMs = sec * 1e3 + ns / 1e6;
    this._logger.log(`retrieveAndGenerate latency: ${elapsedMs.toFixed(2)}ms`);

    return {
      time: elapsedMs,
      results,
    };
  }

  async retrieveNeighbors(nodeId: string, depth: number = 0) {
    const visited = new Set<string>();
    return this.buildGraph(nodeId, depth, visited);
  }

  private async buildGraph(
    nodeId: string,
    depth: number,
    visited: Set<string>,
    stripUsages = false
  ) {
    // making sure you dont revisit the same node
    if (visited.has(nodeId)) {
      return null;
    }
    visited.add(nodeId);

    // find the node entity in question
    const nodeEntity = await this._nodeRepo.findOne({
      where: { id: nodeId },
    });

    if (!nodeEntity) {
      throw new Error(`Node with id ${nodeId} not found`);
    }

    const context: ContextV1 = stripUsages
      ? (({ usages, ...rest }) => rest)(nodeEntity.context)
      : nodeEntity.context;

    const payload: GraphNodePayload = {
      title: nodeEntity.identifier,
      filePath: nodeEntity.filePath,
      declarationType: nodeEntity.context.declarationType,
      context,
      neighbours: [],
    };

    if (depth <= 0) {
      return payload;
    }

    // find edges where this node is source or target
    const edges = await this._edgeRepo.find({
      where: [{ source: { id: nodeId } }, { target: { id: nodeId } }],
      relations: ["source", "target"],
    });

    for (const edge of edges) {
      // pick the other end of the edge
      const neighbourEntity =
        edge.source.id === nodeId ? edge.target : edge.source;

      if (visited.has(neighbourEntity.id)) {
        continue;
      }

      // recursive
      const neighbourPayload = await this.buildGraph(
        neighbourEntity.id,
        depth - 1,
        visited,
        true
      );
      if (neighbourPayload) {
        payload.neighbours.push({
          relType: edge.relType as RelationshipType,
          node: neighbourPayload,
        } as GraphNeighbor);
      }
    }

    return payload;
  }
}
