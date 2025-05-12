import { EntryPoint } from "./types";
import * as fs from "fs";
import * as ts from "typescript";
import { getAllFiles } from "./files";
import { Logger } from "@nestjs/common";

const logger = new Logger("ImportFinder");

export function findUsagePoints(
  identifier: string,
  folderPath: string,
  identifierDeclationFile: string
): EntryPoint[] {
  const entryPoints: EntryPoint[] = [];
  const files = getAllFiles(folderPath, "ts");

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // skip the file in which the method/file is originally declared
    if (file === identifierDeclationFile) {
      return;
    }

    // traverse the AST to look for an import of the given identifier.
    let found = false;
    const visit = (node: ts.Node) => {
      if (found) {
        return;
      }
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        if (importClause) {
          // check whether the file gets imported
          if (importClause.name && importClause.name.text === identifier) {
            found = true;
            entryPoints.push({
              codeSnippet: node.getFullText(),
              filepath: file,
            });
            return;
          }
          // check for named imports like import { Item } from
          if (
            importClause.namedBindings &&
            ts.isNamedImports(importClause.namedBindings)
          ) {
            const elements = importClause.namedBindings.elements;
            for (const element of elements) {
              if (element.name.text === identifier) {
                found = true;
                entryPoints.push({
                  // add the full file content for the code snippet
                  codeSnippet: content,
                  filepath: file,
                });
                return;
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  });

  logger.log(
    `Found ${entryPoints.length} entry point(s) for identifier "${identifier}"`
  );
  return entryPoints;
}
