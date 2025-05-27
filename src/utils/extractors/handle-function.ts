import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import ts from "typescript";
import { createEdge, handleIdentifier } from "./code-node-handler";
import { findDependenciesInNode } from "./import-finder";
import { Extracted, ImportDeclarationInfo } from "../types/types";
import { RelationshipType } from "../types/context";

/**
 * Handles the extraction of identifiers and edges from a TypeScript function or method declaration node.
 * 
 * @param node - the TypeScript function or method declaration node
 * @param folderPath - the folder path where the file is located
 * @param filePath - the file path of the TypeScript file
 * @param fileImports - the imports found in the file
 * @param source - the source CodeNodeEntity that this function or method belongs to
 * 
 * @returns - An object containing extracted identifiers and edges
 */
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
