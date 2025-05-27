import * as ts from "typescript";
import { v4 as uuidv4 } from "uuid";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { findUsagePoints } from "./import-finder";
import { RelationshipType } from "../types/context";

/**
 * create a new identifier
 * @param node - the TypeScript AST node
 * @param folderPath - the folder path where the file is located
 * @param filePath - the file path of the TypeScript file
 * @returns CodeNodeEntity | undefined
 */
export function handleIdentifier(
  node: ts.Node,
  folderPath: string,
  filePath: string
) {
  if (ts.isIdentifier(node)) {
    const codeNode = new CodeNodeEntity();
    const nodeContext = getDeclarationType(node);
    const isExported = isExportedIdentifier(node);

    const usageResult = isExported
      ? findUsagePoints(node.text, folderPath, filePath)
      : { usages: [], subClasses: [] };

    const { usages, subClasses } = usageResult;

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

/**
 * check if the identifier is exported
 * @param node - the TypeScript AST node
 * @returns boolean - true if the identifier is exported, false otherwise
 */
function isExportedIdentifier(node: ts.Node) {
  // parent node - since this is the identifier node
  const parent = node.parent as ts.Declaration;
  const flags = ts.getCombinedModifierFlags(parent);
  const isExported = Boolean(flags & ts.ModifierFlags.Export);

  return isExported;
}

/**
 * get the declaration type and code snippet of a node
 * @param node - the TypeScript AST node
 * @returns { declarationType: string; codeSnippet: string; } 
 *            - an object containing the declaration type and code snippet
 */
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

/**
 * creates an edge
 * 
 * @param source - the source CodeNodeEntity 
 * @param target - the target CodeNodeEntity
 * @param relType - between the two nodes RelationshipType
 * @returns  CodeEdgeEntity - the created edge entity
 */
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
