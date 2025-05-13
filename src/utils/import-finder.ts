import { ImportDeclarationInfo, UsagePoint } from "./types";
import * as fs from "fs";
import * as ts from "typescript";
import { getAllFiles } from "./files";
import { Logger } from "@nestjs/common";

const logger = new Logger("ImportFinder");

export function findUsagePoints(
  identifier: string,
  folderPath: string,
  identifierDeclationFile: string
): UsagePoint[] {
  const usages: UsagePoint[] = [];
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
    };
    visit(sourceFile);

    return usages;
  }

  logger.log(`Found ${usages.length} usages(s) for identifier "${identifier}"`);
  return usages;
}

function findEnclosingStatement(node: ts.Node): ts.Node {
  let current: ts.Node | undefined = node;
  while (current && !ts.isStatement(current)) {
    current = current.parent;
  }
  return current ?? node;
}

function isInsideImport(node: ts.Node): boolean {
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
