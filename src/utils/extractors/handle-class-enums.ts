import * as ts from "typescript";
import {
  Extracted,
  ImportDeclarationInfo,
  RelationshipType,
} from "src/utils/types";
import { handleFunctionMethod } from "./handle-function";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { findDependenciesInNode } from "./import-finder";
import { createEdge, handleIdentifier } from "./code-node-handler";

export function processClass(
  node: ts.ClassDeclaration | ts.InterfaceDeclaration,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[]
): Extracted {
  const identifiers: CodeNodeEntity[] = [];
  const edges: CodeEdgeEntity[] = [];

  if (!node.name) return { identifiers, edges };

  const classIdentifier = handleIdentifier(node.name, folderPath, filePath);

  if (!classIdentifier) return { identifiers, edges };

  classIdentifier.context.dependencies = findDependenciesInNode(
    node,
    fileImports
  );

  identifiers.push(classIdentifier);

  node.members.forEach((member) => {
    // METHOD handling
    if (
      ts.isMethodDeclaration(member) ||
      ts.isMethodSignature(member) ||
      ts.isFunctionDeclaration(member)
    ) {
      const { identifiers: extractedIdentifiers, edges: extractedEdges } =
        handleFunctionMethod(
          member,
          folderPath,
          filePath,
          fileImports,
          classIdentifier
        );
      identifiers.push(...extractedIdentifiers);
      edges.push(...extractedEdges);
    }

    // PROPERTY handling
    if (
      (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) &&
      member.name
    ) {
      const property = handleIdentifier(member.name, folderPath, filePath);
      if (property) {
        identifiers.push(property);
        const edge = createEdge(
          classIdentifier,
          property,
          RelationshipType.PROPERTY
        );
        edges.push(edge);
      }
    }
  });
  return { identifiers, edges };
}

export function processEnum(
  node: ts.EnumDeclaration,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[]
) {
  const identifiers: CodeNodeEntity[] = [];
  const edges: CodeEdgeEntity[] = [];

  const enumId = handleIdentifier(node.name, folderPath, filePath);

  if (!enumId) return { identifiers, edges };

  enumId.context.dependencies = findDependenciesInNode(node, fileImports);

  identifiers.push(enumId);

  node.members.forEach((member) => {
    if (ts.isEnumMember(member)) {
      const memberId = handleIdentifier(member.name, folderPath, filePath);
      if (memberId) {
        identifiers.push(memberId);
        edges.push(createEdge(enumId, memberId, RelationshipType.ENUM_MEMBER));
      }
    }
  });

  return { identifiers, edges };
}
