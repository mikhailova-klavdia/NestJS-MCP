import * as ts from "typescript";
import { findEntryPoints } from "src/utils/import-finder";
import { CodeEdgeEntity } from "./entities/code-edge.entity";
import { CodeNodeEntity } from "./entities/code-node.entity";
import { RelationshipType } from "src/utils/types";

export function handleClassAndInterfaceDeclaration(
  node: ts.Node,
  folderPath: string,
  filePath: string
) {
  const extractedIdentifiers: CodeNodeEntity[] = [];
  const extractedEdges: CodeEdgeEntity[] = [];

  if (
    (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
    node.name
  ) {
    const classIdentifier = handleIdentifier(node.name, folderPath, filePath);

    if (classIdentifier) {
      extractedIdentifiers.push(classIdentifier);

      node.members.forEach((member) => {
        // METHOD handling
        const {
          extractedIdentifiers: extractedMethodIdentifiers,
          extractedEdges: extractedMethodEdges,
        } = handleFunctionAndMethodDeclaration(
          member,
          folderPath,
          filePath,
          classIdentifier
        );
        extractedIdentifiers.push(...extractedMethodIdentifiers);
        extractedEdges.push(...extractedMethodEdges);
        // PROPERTY handling
        if (
          (ts.isPropertyDeclaration(member) ||
            ts.isPropertySignature(member)) &&
          member.name
        ) {
          const property = handleIdentifier(member.name, folderPath, filePath);
          if (property) {
            extractedIdentifiers.push(property);
            const edge = new CodeEdgeEntity();
            edge.source = classIdentifier;
            edge.target = property;
            edge.relType = RelationshipType.PROPERTY;
            extractedEdges.push(edge);
          }
        }
      });
    }
  }

  return { extractedIdentifiers, extractedEdges };
}

export function handleFunctionAndMethodDeclaration(
  node: ts.Node,
  folderPath: string,
  filePath: string,
  source?: CodeNodeEntity
) {
  const extractedIdentifiers: CodeNodeEntity[] = [];
  const extractedEdges: CodeEdgeEntity[] = [];

  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isMethodSignature(node)) &&
    node.name
  ) {
    const functionIdentifier = handleIdentifier(
      node.name,
      folderPath,
      filePath
    );
    if (functionIdentifier) {
      extractedIdentifiers.push(functionIdentifier);

      if (source) {
        const edge = new CodeEdgeEntity();
        edge.relType = RelationshipType.CLASS_METHOD;
        edge.source = source;
        edge.target = functionIdentifier;

        extractedEdges.push(edge);
      }

      node.parameters.forEach((param) => {
        const paramIdentifier = handleIdentifier(
          param.name,
          folderPath,
          filePath
        );

        if (paramIdentifier) {
          const edge = new CodeEdgeEntity();
          edge.relType = RelationshipType.PARAMETER;
          edge.source = functionIdentifier;
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
