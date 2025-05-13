import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";

export type ContextV1 = {
  declarationType?: string;
  usages?: UsagePoint[] | null;
  dependancies?: string | null;
  codeSnippet: string;
};

export type UsagePoint = {
  codeSnippet: string;
  filepath: string;
};

export enum RelationshipType {
  PARAMETER = "PARAMETER",
  METHOD = "METHOD",
  PROPERTY = "PROPERTY",
  ENUM_MEMBER = "ENUM_MEMBER",
}

export type CodeGraph = {
  identifiers: CodeNodeEntity[];
  edges: CodeEdgeEntity[];
};

export type GraphNeighbor = {
  relType: RelationshipType;
  node: GraphNodePayload;
};

export type GraphNodePayload = {
  title: string;
  similarity?: number;
  filePath: string;
  declarationType?: string;
  context: ContextV1;
  neighbours: GraphNeighbor[];
};
