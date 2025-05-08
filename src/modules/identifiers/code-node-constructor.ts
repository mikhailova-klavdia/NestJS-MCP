import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as ts from "typescript";
import { ExtractedIdentifier } from "src/utils/types";
import { getAllFiles } from "src/utils/files";
import { findEntryPoints } from "src/utils/import-finder";

@Injectable()
export class CodeNodeExtractor {
  private readonly logger = new Logger(CodeNodeExtractor.name);
  /**
   * Extracts all identifier tokens from a given TypeScript file, excluding identifiers from import declarations.
   */
  private extractIdentifiersFromFile(
    filePath: string,
    folderPath: string
  ): ExtractedIdentifier[] {
    const content = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    const identifiers: ExtractedIdentifier[] = [];

    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) ||
        ts.isImportClause(node) ||
        ts.isImportSpecifier(node)
      ) {
        return;
      }

      if (ts.isIdentifier(node)) {
        // grab identifier context
        const nodeContext = this.getDeclarationType(node);
        const entryPoints = findEntryPoints(
          node.text,
          folderPath,
          filePath
        );

        identifiers.push({
          identifier: node.text,
          context: {
            declarationType: nodeContext.declarationType,
            codeSnippet: nodeContext.codeSnippet,
            entryPoints: entryPoints,
            importRequirements: null,
          },
          filePath,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return identifiers;
  }

  private getDeclarationType(node: ts.Node): {
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

  /**
   * Scans the given folder recursively, reads all `.ts` files,
   * extracts identifiers from each, and returns a list of identifier data.
   */
  getIdentifiersFromFolder(folderPath: string): ExtractedIdentifier[] {
    const tsFiles = getAllFiles(folderPath, ".ts");
    this.logger.log(
      `Extracting identifiers from ${tsFiles.length} TypeScript files in ${folderPath}`
    );

    const results: ExtractedIdentifier[] = [];
    let count = 0;

    for (const file of tsFiles) {
      const identifiers = this.extractIdentifiersFromFile(file, folderPath);
      results.push(...identifiers);
      this.logger.log(`Processed ${++count} / ${tsFiles.length} files`);
    }

    this.logger.log(
      `✅ Finished extracting ${results.length} identifiers from ${tsFiles.length} files.`
    );

    return results;
  }
}
