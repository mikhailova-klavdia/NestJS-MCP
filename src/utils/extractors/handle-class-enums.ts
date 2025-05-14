import * as ts from "typescript";
import { handleFunctionMethod } from "./handle-function";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { findDependenciesInNode } from "./import-finder";
import { createEdge, handleIdentifier } from "./code-node-handler";
import { RelationshipType } from "../types/context";
import { ImportDeclarationInfo, Extracted } from "../types/types";

export function processClass(
  node: ts.ClassDeclaration | ts.InterfaceDeclaration,
  folderPath: string,
  filePath: string,
  fileImports: ImportDeclarationInfo[]
): Extracted {
  let identifiers: CodeNodeEntity[] = [];
  let edges: CodeEdgeEntity[] = [];

  if (!node.name) return { identifiers, edges };

  const classIdentifier = handleIdentifier(node.name, folderPath, filePath);

  if (!classIdentifier) return { identifiers, edges };

  classIdentifier.context.dependencies = findDependenciesInNode(
    node,
    fileImports
  );

  identifiers.push(classIdentifier);

  // heritage clause handling
  if (node.heritageClauses) {
    for (const clause of node.heritageClauses) {
      const isExtends = clause.token === ts.SyntaxKind.ExtendsKeyword;
      const isImplements = clause.token === ts.SyntaxKind.ImplementsKeyword;

      for (const type of clause.types) {
        const heritageName = type.expression.getText();
        // check whether the class/interface was imported
        let importDeclaration = fileImports.find((decl) =>
          decl.namedImports.includes(heritageName)
        );

        if (!importDeclaration) {
          // search for the node within the same file 
        }
      }
    }
  }

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
