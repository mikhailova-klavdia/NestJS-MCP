import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import ts from "typescript";
import { ImportDeclarationInfo, RelationshipType } from "../types";
import { createEdge, handleIdentifier } from "./code-node-handler";
import { findDependenciesInNode } from "./import-finder";

export function handleFunctionMethod(
  node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.MethodSignature,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[],
  source?: CodeNodeEntity
) {
  const extractedIdentifiers: CodeNodeEntity[] = [];
  const extractedEdges: CodeEdgeEntity[] = [];

  if (!node.name) return { extractedIdentifiers, extractedEdges };

  const functionIdentifier = handleIdentifier(node.name, folderPath, filePath);

  if (!functionIdentifier) return { extractedIdentifiers, extractedEdges };
  functionIdentifier.context.dependencies = findDependenciesInNode(
    node,
    fileImports
  );

  extractedIdentifiers.push(functionIdentifier);

  if (source) {
    const edge = createEdge(
      source,
      functionIdentifier,
      RelationshipType.METHOD
    );
    extractedEdges.push(edge);
  }

  node.parameters.forEach((param) => {
    const paramIdentifier = handleIdentifier(param.name, folderPath, filePath);

    if (paramIdentifier) {
      const edge = createEdge(
        functionIdentifier,
        paramIdentifier,
        RelationshipType.PARAMETER
      );
      extractedIdentifiers.push(paramIdentifier);
      extractedEdges.push(edge);
    }
  });

  return { extractedIdentifiers, extractedEdges };
}
