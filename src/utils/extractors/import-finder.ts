import * as fs from "fs";
import * as ts from "typescript";
import { Logger } from "@nestjs/common";
import { getAllFiles } from "../files";
import { UsagePoint } from "../types/context";
import { ImportDeclarationInfo } from "../types/types";
import { handleIdentifier } from "./code-node-handler";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";

const logger = new Logger("ImportFinder");

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

      if (ts.isClassDeclaration(node) && node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            for (const type of clause.types) {
              if (
                ts.isIdentifier(type.expression) &&
                type.expression.text == identifier
              ) {
                // found the subclass
                console.log("SUBCLASS FOUND");
                const codeNode = handleIdentifier(
                  type.expression,
                  folderPath,
                  file
                );
                if (codeNode) {
                  subClasses.push(codeNode);
                  console.log(codeNode);
                }
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

export function findEnclosingStatement(node: ts.Node): ts.Node {
  let current: ts.Node | undefined = node;
  while (current && !ts.isStatement(current)) {
    current = current.parent;
  }
  return current ?? node;
}

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
