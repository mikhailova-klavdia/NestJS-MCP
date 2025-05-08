import * as ts from "typescript";
import { findEntryPoints } from "src/utils/import-finder";
import { CodeEdgeEntity } from "./entities/code-edge.entity";
import { CodeNodeEntity } from "./entities/code-node.entity";
import { RelationshipType } from "src/utils/types";

export function handleFunctionDeclaration(
  node: ts.Node,
  folderPath: string,
  filePath: string
) {
  const extractedIdentifiers: CodeNodeEntity[] = [];
  const extractedEdges: CodeEdgeEntity[] = [];

  if (ts.isFunctionDeclaration(node) && node.name) {
    const identifier = handleIdentifier(node.name, folderPath, filePath);
    if (identifier) {
      extractedIdentifiers.push(identifier);

      node.parameters.forEach((param) => {
        const paramIdentifier = handleIdentifier(
          param.name,
          folderPath,
          filePath
        );
        if (paramIdentifier) {
          const edge = new CodeEdgeEntity();
          edge.relType = RelationshipType.PARAMETER;
          edge.source = identifier;
          edge.target = paramIdentifier;

          extractedIdentifiers.push(paramIdentifier);
          extractedEdges.push(edge);
        }
      });
    }
  }

  return { extractedIdentifiers, extractedEdges };
}

export function handleIdentifier(
  node: ts.Node,
  folderPath: string,
  filePath: string
) {
  if (ts.isIdentifier(node)) {
    const codeNode = new CodeNodeEntity();
    // grab identifier context
    const nodeContext = getDeclarationType(node);
    const entryPoints = findEntryPoints(node.text, folderPath, filePath);

    codeNode.identifier = node.text;
    codeNode.context = {
      declarationType: nodeContext.declarationType,
      codeSnippet: nodeContext.codeSnippet,
      entryPoints: entryPoints,
      importRequirements: null,
    };
    codeNode.filePath = filePath;

    return codeNode;
  }
}

function getDeclarationType(node: ts.Node): {
  declarationType: string;
  codeSnippet: string;
} {
  let currentNode: ts.Node | undefined = node;

  while (currentNode) {
    if (
      ts.isClassDeclaration(currentNode) ||
      ts.isFunctionDeclaration(currentNode) ||
      ts.isVariableDeclaration(currentNode) ||
      ts.isImportDeclaration(currentNode) ||
      ts.isExportDeclaration(currentNode) ||
      ts.isMethodDeclaration(currentNode) ||
      ts.isPropertyDeclaration(currentNode) ||
      ts.isConstructorDeclaration(currentNode) ||
      ts.isParameter(currentNode) ||
      ts.isInterfaceDeclaration(currentNode) ||
      ts.isEnumDeclaration(currentNode) ||
      ts.isTypeAliasDeclaration(currentNode) ||
      ts.isModuleDeclaration(currentNode)
    ) {
      return {
        declarationType: ts.SyntaxKind[currentNode.kind],
        codeSnippet: currentNode.getFullText(),
      };
    }
    currentNode = currentNode.parent;
  }

  return {
    declarationType: ts.SyntaxKind[node.kind],
    codeSnippet: node.getFullText(),
  };
}
