import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { Declaration } from "typescript";

export type ContextV1 = {
  declarationType: Declaration | string | null;
  entryPoints?: EntryPoint[] | null;
  importRequirements?: string | null;
  codeSnippet: string;
};

export type EntryPoint = {
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
