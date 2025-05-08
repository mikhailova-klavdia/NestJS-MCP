import { Declaration } from "typescript";

export type ExtractedIdentifier = {
  identifier: string;
  context?: ContextV1;
  filePath?: string;
  codeSnippet?: string;
  entryPoints?: EntryPoint[];
};

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

export interface ExtractedEdge {
  sourceId: string;
  targetId: string;
  relType: "IMPORTS" | "CALLS" | "EXTENDS" | "IMPLEMENTS";
}
