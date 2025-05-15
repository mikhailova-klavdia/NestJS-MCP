import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { ImportDeclarationInfo } from "./types";

export type ContextV1 = {
  usages?: UsagePoint[] | null;
  dependencies?: ImportDeclarationInfo[];
  codeSnippet: string;
};

export type UsagePoint = {
  codeSnippet: string;
  filepath: string;
  subclass?: CodeNodeEntity;
};

export enum RelationshipType {
  PARAMETER = "PARAMETER",
  METHOD = "METHOD",
  PROPERTY = "PROPERTY",
  ENUM_MEMBER = "ENUM_MEMBER",
  SUBCLASS = "SUBCLASS",
}
