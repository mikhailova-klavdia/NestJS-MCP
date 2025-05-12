import { Injectable, Logger } from "@nestjs/common";
import { EmbedConfig } from "../../embedding-config";
import { IdentifierService } from "../identifiers/identifier.service";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CodeEdgeEntity } from "../identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import { CodeGraph, GraphNodePayload, GraphResponse } from "src/utils/types";

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
    const relevantIdentifier =
      this._identifierService.findTopNRelevantIdentifiers(
        identifiers,
        queryEmbedding,
        topN
      );

    let graph: GraphResponse | undefined;

    if (depth > 0 && relevantIdentifier.length > 0) {
      // Multi‐source BFS: start from all seed IDs at once
      const seedIds = relevantIdentifier.map(
        (identifier) => identifier.identifier.id
      );
      const visited = new Set<string>(seedIds);
      let frontier = [...seedIds];
      const allEdges: CodeEdgeEntity[] = [];
      const allNodeIds = new Set<string>(seedIds);

      for (let level = 0; level < depth; level++) {
        if (!frontier.length) break;

        const edges = await this._edgeRepo.find({
          where: [
            { source: { id: In(frontier) } },
            { target: { id: In(frontier) } },
          ],
          relations: ["source", "target"],
        });

        allEdges.push(...edges);

        const nextFrontier: string[] = [];
        for (const edge of edges) {
          for (const neighbor of [edge.source, edge.target]) {
            if (!visited.has(neighbor.id)) {
              visited.add(neighbor.id);
              nextFrontier.push(neighbor.id);
              allNodeIds.add(neighbor.id);
            }
          }
        }

        frontier = nextFrontier;
      }

      // Load full node entities for everything we discovered
      const nodes = await this._nodeRepo.find({
        where: { id: In(Array.from(allNodeIds)) },
      });

      const payloadNodes: GraphNodePayload[] = nodes.map((node) => {
        const rawDecl = node.context.declarationType;
        const safeDecl = rawDecl === undefined ? null : rawDecl;

        return {
          title: node.identifier,
          filePath: node.filePath,
          declarationType: typeof safeDecl === "string" ? safeDecl : undefined,
          context: {
            ...node.context,
            declarationType: safeDecl,
          },
        };
      });

      graph = { nodes: payloadNodes, edges: allEdges };
    }

    const results = relevantIdentifier
      .filter((r) => r.similarity >= minSimilarity)
      .map((doc) => ({
        title: doc.identifier.identifier,
        filePath: doc.identifier.filePath,
        declarationType: doc.identifier.context.declarationType,
        similarity: doc.similarity,
        context: doc.identifier.context,
      }));

    const [sec, ns] = process.hrtime(startTime);
    const elapsedMs = sec * 1e3 + ns / 1e6;
    this._logger.log(`retrieveAndGenerate latency: ${elapsedMs.toFixed(2)}ms`);

    return {
      time: elapsedMs,
      results,
      ...(graph ? { graph } : {}),
    };
  }

  async retrieveNeighbors(nodeId: string, depth: number = 1) {
    const visited = new Set<string>([nodeId]);
    let frontier = [nodeId];
    const allEdges: CodeEdgeEntity[] = [];
    const allNodeIds = new Set<string>([nodeId]);

    for (let level = 0; level < depth; level++) {
      if (frontier.length === 0) break;

      // Find any edge where source or target is in our current frontier
      const edges = await this._edgeRepo.find({
        where: [
          { source: { id: In(frontier) } },
          { target: { id: In(frontier) } },
        ],
        relations: ["source", "target"],
      });

      allEdges.push(...edges);

      // Collect the next wave of neighbors
      const nextFrontier: string[] = [];
      for (const edge of edges) {
        const { source, target } = edge;
        for (const neighbor of [source, target]) {
          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            nextFrontier.push(neighbor.id);
            allNodeIds.add(neighbor.id);
          }
        }
      }

      frontier = nextFrontier;
    }

    // Finally load all the nodes we’ve discovered
    const nodes = await this._nodeRepo.find({
      where: { id: In(Array.from(allNodeIds)) },
    });

    this._logger.log(
      `retrieveNeighbors found ${nodes.length} nodes and ${allEdges.length} edges`
    );

    return { nodes, edges: allEdges };
  }
}
