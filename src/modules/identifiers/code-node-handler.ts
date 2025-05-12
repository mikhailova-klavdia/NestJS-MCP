import * as ts from "typescript";
import { findUsagePoints } from "src/utils/import-finder";
import { CodeEdgeEntity } from "./entities/code-edge.entity";
import { CodeNodeEntity } from "./entities/code-node.entity";
import { RelationshipType } from "src/utils/types";
import { v4 as uuidv4 } from "uuid";

export function processClassEnum(
  node: ts.Node,
  folderPath: string,
  filePath: string
) {
  const extractedIdentifiers: CodeNodeEntity[] = [];
  const extractedEdges: CodeEdgeEntity[] = [];

  if (
    (ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
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
        } = handleFunctionMethod(member, folderPath, filePath, classIdentifier);
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
            const edge = createEdge(
              classIdentifier,
              property,
              RelationshipType.PROPERTY
            );
            extractedEdges.push(edge);
          }
        }

        // ENUM MEMBER
        if (ts.isEnumMember(member)) {
          const enumMember = handleIdentifier(
            member.name,
            folderPath,
            filePath
          );
          if (enumMember) {
            extractedIdentifiers.push(enumMember);
            const edge = createEdge(
              classIdentifier,
              enumMember,
              RelationshipType.ENUM_MEMBER
            );
            extractedEdges.push(edge);
          }
        }
      });
    }
  }

  return { extractedIdentifiers, extractedEdges };
}

export function handleFunctionMethod(
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
        const edge = createEdge(
          source,
          functionIdentifier,
          RelationshipType.METHOD
        );
        extractedEdges.push(edge);
      }

      node.parameters.forEach((param) => {
        const paramIdentifier = handleIdentifier(
          param.name,
          folderPath,
          filePath
        );

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
    const entryPoints = findUsagePoints(node.text, folderPath, filePath);

    codeNode.id = uuidv4();
    codeNode.identifier = node.text;
    codeNode.context = {
      codeSnippet: nodeContext.codeSnippet,
      usages: entryPoints,
      declarationType: nodeContext.declarationType
    };
    codeNode.filePath = filePath;

    return codeNode;
  }
}

function getDeclarationType(node: ts.Node): {
  declarationType: string;
  codeSnippet: string;
} {
  const parentNode = node.parent;
  return {
    declarationType: ts.SyntaxKind[parentNode.kind],
    codeSnippet: node.getFullText(),
  };
}

function createEdge(
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
