import * as fs from "fs";
import * as ts from "typescript";
import { Logger } from "@nestjs/common";
import { getAllFiles } from "../files";
import { UsagePoint } from "../types/context";
import { ImportDeclarationInfo } from "../types/types";
import { handleIdentifier } from "./code-node-handler";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";

const logger = new Logger("ImportFinder");

/**
 * find all usage points of a given identifier in a folder
 * @param identifier - the identifier to search for
 * @param folderPath - the folder path where to search for the identifier
 * @param identifierDeclationFile - the file in which the identifier is originally declared
 * @returns { usages: UsagePoint[]; subClasses: CodeNodeEntity[] }
 */
export function findUsagePoints(
  identifier: string,
  folderPath: string,
  identifierDeclationFile: string
): { usages: UsagePoint[]; subClasses: CodeNodeEntity[] } {
  const usages: UsagePoint[] = [];
  const subClasses: CodeNodeEntity[] = [];
  const files = getAllFiles(folderPath, "ts");

  for (const file of files) {
    // skip the file in which the method/file is originally declared
    if (file === identifierDeclationFile) {
      continue;
    }

    const content = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // traverse the AST to look for an import of the given identifier.
    let imported = false;
    ts.forEachChild(sourceFile, (node) => {
      if (imported) return;

      if (ts.isImportDeclaration(node) && node.importClause) {
        const { name, namedBindings } = node.importClause;

        // default import `import Foo from "…"`
        if (name?.text === identifier) {
          imported = true;
          return;
        }

        // named imports `import { Foo, Bar } from "…"`
        if (
          namedBindings &&
          ts.isNamedImports(namedBindings) &&
          namedBindings.elements.some((e) => e.name.text === identifier)
        ) {
          imported = true;
          return;
        }
      }
    });

    if (!imported) {
      continue;
    }

    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node) && node.text === identifier) {
        // skip import statement
        if (!isInsideImport(node)) {
          const stmt = findEnclosingStatement(node);
          usages.push({
            filepath: file,
            codeSnippet: stmt.getText().trim(),
          });
        }
      }
      ts.forEachChild(node, visit);

      // search for subclasses
      if (ts.isClassDeclaration(node) && node.heritageClauses && node.name) {
        for (const clause of node.heritageClauses) {
          if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            if (
              clause.types.some(
                (t) =>
                  ts.isIdentifier(t.expression) &&
                  t.expression.text === identifier
              )
            ) {
              // found the subclass
              const codeNode = handleIdentifier(node.name, folderPath, file);
              if (codeNode) {
                usages.push({
                  filepath: file,
                  codeSnippet: codeNode.context.codeSnippet,
                  subclass: codeNode,
                });
              }
            }
          }
        }
      }
    };
    visit(sourceFile);

    return { usages, subClasses };
  }

  logger.log(`Found ${usages.length} usages(s) for identifier "${identifier}"`);
  return { usages, subClasses };
}

/**
 * Finds the enclosing statement for a given TypeScript node
 * @param node - The TypeScript node to find the enclosing statement for
 * @returns The enclosing statement node, or the original node if no statement is found
 */
export function findEnclosingStatement(node: ts.Node): ts.Node {
  let current: ts.Node | undefined = node;
  while (current && !ts.isStatement(current)) {
    current = current.parent;
  }
  return current ?? node;
}

/**
 * Checks if a given TypeScript node is inside an import declaration
 * @param node - The TypeScript node
 * @returns True if the node is inside an import declaration, false otherwise
 */
export function isInsideImport(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isImportDeclaration(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Finds all import declarations in a TypeScript source file
 * @param sourceFile - The TypeScript source file to search for import declarations
 * @returns An array of import declaration information, including module name, named imports, and code snippet
 */
export function findImports(
  sourceFile: ts.SourceFile
): ImportDeclarationInfo[] {
  const imports: ImportDeclarationInfo[] = [];

  sourceFile.statements.forEach((statement) => {
    if (!ts.isImportDeclaration(statement)) return;

    const moduleName = (statement.moduleSpecifier as ts.StringLiteral).text;
    const clause = statement.importClause;
    const namedImports: string[] = [];

    if (clause) {
      if (clause.name) {
        namedImports.push(clause.name.text);
      }

      const bindings = clause.namedBindings;
      if (bindings) {
        if (ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            namedImports.push(element.name.text);
          }
        } else if (ts.isNamespaceImport(bindings)) {
          namedImports.push(bindings.name.text);
        }
      }
    }

    imports.push({
      moduleName,
      namedImports,
      codeSnippet: statement.getText().trim(),
    });
  });

  return imports;
}

/**
 *  Finds all dependencies (imported modules) used in a TypeScript node
 * @param root - The root node of the TypeScript AST to search for dependencies
 * @param fileImports - An array of import declarations found in the file
 * @returns An array of import declaration information for the dependencies used by the node
 */
export function findDependenciesInNode(
  root: ts.Node,
  fileImports: ImportDeclarationInfo[]
): ImportDeclarationInfo[] {
  const usedModules = new Set<ImportDeclarationInfo>();

  function visit(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      for (const importStatement of fileImports) {
        if (importStatement.namedImports.includes(node.text)) {
          usedModules.add(importStatement);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(root);
  return Array.from(usedModules);
}
