import * as ts from "typescript";
import { handleFunctionMethod } from "./handle-function";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { findDependenciesInNode } from "./import-finder";
import { createEdge, handleIdentifier } from "./code-node-handler";
import { RelationshipType } from "../types/context";
import { ImportDeclarationInfo, Extracted } from "../types/types";
import { Repository } from "typeorm";

export async function processClass(
  node: ts.ClassDeclaration | ts.InterfaceDeclaration,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[],
  nodeRepo: Repository<CodeNodeEntity>
): Promise<Extracted> {
  let identifiers: CodeNodeEntity[] = [];
  let edges: CodeEdgeEntity[] = [];

  if (!node.name) return { identifiers, edges };

  let classIdentifier = handleIdentifier(node.name, folderPath, filePath);

  if (!classIdentifier) return { identifiers, edges };

  // check whether the class is already in database
  const dbClassCheck = await nodeRepo.findOne({
    where: {
      identifier: classIdentifier?.identifier,
      filePath: classIdentifier?.filePath,
      declarationType: classIdentifier.declarationType,
    },
  });

  if (dbClassCheck) {
    classIdentifier = dbClassCheck;
  }

  const usages = classIdentifier.context.usages ?? [];

  // check for subclasses
  for (const usage of usages) {
    if (usage.subclass) {
      const subclass = await nodeRepo.save(usage.subclass);
      identifiers.push(subclass);

      edges.push(
        createEdge(classIdentifier, subclass, RelationshipType.SUBCLASS)
      );
    }
  }

  classIdentifier.context.dependencies = findDependenciesInNode(
    node,
    fileImports
  );

  identifiers.push(classIdentifier);

  // member handling
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

  identifiers = await nodeRepo.save(identifiers);

  return { identifiers, edges };
}

export function processEnum(
  node: ts.EnumDeclaration,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[]
): Extracted {
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
