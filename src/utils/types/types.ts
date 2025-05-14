import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { ContextV1, RelationshipType } from "./context";

export type GraphNeighbor = {
  relType: RelationshipType;
  node: GraphNodePayload;
};

export type CodeGraph = {
  identifiers: CodeNodeEntity[];
  edges: CodeEdgeEntity[];
};

export type GraphNodePayload = {
  title: string;
  similarity?: number;
  filePath: string;
  declarationType?: string;
  context: ContextV1;
  neighbours: GraphNeighbor[];
};

export type Extracted = {
  identifiers: CodeNodeEntity[];
  edges: CodeEdgeEntity[];
};

export type ImportDeclarationInfo = {
  moduleName: string;
  namedImports: string[];
  codeSnippet: string;
}