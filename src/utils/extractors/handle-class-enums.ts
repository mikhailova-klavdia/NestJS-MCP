import * as ts from "typescript";
import { ImportDeclarationInfo, RelationshipType } from "src/utils/types";
import { handleFunctionMethod } from "./handle-function";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { findDependenciesInNode } from "./import-finder";
import { createEdge, handleIdentifier } from "./code-node-handler";

export function processClass(
  node: ts.Node,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[]
) {
  const extractedIdentifiers: CodeNodeEntity[] = [];
  const extractedEdges: CodeEdgeEntity[] = [];

  if (
    (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
    node.name
  ) {
    const classIdentifier = handleIdentifier(node.name, folderPath, filePath);

    if (!classIdentifier) return { extractedIdentifiers, extractedEdges };

    classIdentifier.context.dependencies = findDependenciesInNode(
      node,
      fileImports
    );

    extractedIdentifiers.push(classIdentifier);

    node.members.forEach((member) => {
      // METHOD handling
      const {
        extractedIdentifiers: extractedMethodIdentifiers,
        extractedEdges: extractedMethodEdges,
      } = handleFunctionMethod(
        member,
        folderPath,
        filePath,
        fileImports,
        classIdentifier
      );
      extractedIdentifiers.push(...extractedMethodIdentifiers);
      extractedEdges.push(...extractedMethodEdges);

      // PROPERTY handling
      if (
        (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) &&
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
    });
  }

  return { extractedIdentifiers, extractedEdges };
}

export function processEnum(
  node: ts.Node,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[]
) {
  const extractedIdentifiers: CodeNodeEntity[] = [];
  const extractedEdges: CodeEdgeEntity[] = [];

  if (ts.isEnumDeclaration(node) && node.name) {
    const enumId = handleIdentifier(node.name, folderPath, filePath);

    if (!enumId) return { extractedIdentifiers, extractedEdges };

    enumId.context.dependencies = findDependenciesInNode(node, fileImports);

    extractedIdentifiers.push(enumId);

    node.members.forEach((member) => {
      if (ts.isEnumMember(member)) {
        const memberId = handleIdentifier(member.name, folderPath, filePath);
        if (memberId) {
          extractedIdentifiers.push(memberId);
          extractedEdges.push(
            createEdge(enumId, memberId, RelationshipType.ENUM_MEMBER)
          );
        }
      }
    });
  }

  return { extractedIdentifiers, extractedEdges };
}
