import * as ts from "typescript";
import { RelationshipType } from "src/utils/types";
import { v4 as uuidv4 } from "uuid";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { findUsagePoints } from "./import-finder";

export function handleIdentifier(
  node: ts.Node,
  folderPath: string,
  filePath: string
) {
  if (ts.isIdentifier(node)) {
    const codeNode = new CodeNodeEntity();
    // grab identifier context
    const nodeContext = getDeclarationType(node);
    const isExported = isExportedIdentifier(node);
    const usages = isExported ? findUsagePoints(node.text, folderPath, filePath) : [];

    codeNode.id = uuidv4();
    codeNode.identifier = node.text;
    codeNode.declarationType = nodeContext.declarationType;
    codeNode.context = {
      codeSnippet: nodeContext.codeSnippet,
      usages: usages,
    };
    codeNode.filePath = filePath;

    return codeNode;
  }
}

function isExportedIdentifier(node: ts.Node) {
  // the the declaration
  const parent = node.parent as ts.Declaration;
  const flags = ts.getCombinedModifierFlags(parent);
  const isExported = Boolean(flags & ts.ModifierFlags.Export);

  return isExported;
}

function getDeclarationType(node: ts.Node): {
  declarationType: string;
  codeSnippet: string;
} {
  const parentNode = node.parent;
  return {
    declarationType: ts.SyntaxKind[parentNode.kind],
    codeSnippet: parentNode.getFullText(),
  };
}

export function createEdge(
  source: CodeNodeEntity,
  target: CodeNodeEntity,
  relType: RelationshipType
): CodeEdgeEntity {
  const edge = new CodeEdgeEntity();
  edge.source = source;
  edge.target = target;
  edge.relType = relType;
  return edge;
}
