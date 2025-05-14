import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import ts from "typescript";
import { Extracted, ImportDeclarationInfo, RelationshipType } from "../types";
import { createEdge, handleIdentifier } from "./code-node-handler";
import { findDependenciesInNode } from "./import-finder";

export function handleFunctionMethod(
  node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.MethodSignature,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[],
  source?: CodeNodeEntity
) : Extracted {
  const identifiers: CodeNodeEntity[] = [];
  const edges: CodeEdgeEntity[] = [];

  if (!node.name) return { identifiers, edges };

  const functionIdentifier = handleIdentifier(node.name, folderPath, filePath);

  if (!functionIdentifier) return { identifiers, edges };
  functionIdentifier.context.dependencies = findDependenciesInNode(
    node,
    fileImports
  );

  identifiers.push(functionIdentifier);

  if (source) {
    const edge = createEdge(
      source,
      functionIdentifier,
      RelationshipType.METHOD
    );
    edges.push(edge);
  }

  node.parameters.forEach((param) => {
    const paramIdentifier = handleIdentifier(param.name, folderPath, filePath);

    if (paramIdentifier) {
      const edge = createEdge(
        functionIdentifier,
        paramIdentifier,
        RelationshipType.PARAMETER
      );
      identifiers.push(paramIdentifier);
      edges.push(edge);
    }
  });

  return { identifiers, edges };
}
