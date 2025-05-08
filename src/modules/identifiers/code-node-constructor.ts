import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as ts from "typescript";
import { getAllFiles } from "src/utils/files";
import { findEntryPoints } from "src/utils/import-finder";
import { CodeNodeEntity } from "./entities/code-node.entity";

@Injectable()
export class CodeNodeExtractor {
  private readonly logger = new Logger(CodeNodeExtractor.name);
  /**
   * Extracts all identifier tokens from a given TypeScript file, excluding identifiers from import declarations.
   */
  private extractIdentifiersFromFile(
    filePath: string,
    folderPath: string
  ): CodeNodeEntity[] {
    const content = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    const identifiers: CodeNodeEntity[] = [];

    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) ||
        ts.isImportClause(node) ||
        ts.isImportSpecifier(node)
      ) {
        return;
      }

      const codeNode = this.handleIdentifier(node, folderPath, filePath)

      if (codeNode) {
        identifiers.push(codeNode)
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return identifiers;
  }

  private handleIdentifier(
    node: ts.Node,
    folderPath: string,
    filePath: string
  ) {
    if (ts.isIdentifier(node)) {
      const codeNode = new CodeNodeEntity();
      // grab identifier context
      const nodeContext = this.getDeclarationType(node);
      const entryPoints = findEntryPoints(node.text, folderPath, filePath);

      codeNode.identifier = node.text;
      codeNode.context = {
        declarationType: nodeContext.declarationType,
        codeSnippet: nodeContext.codeSnippet,
        entryPoints: entryPoints,
        importRequirements: null,
      };
      codeNode.filePath = filePath;

      return codeNode
    }
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
  getIdentifiersFromFolder(folderPath: string): CodeNodeEntity[] {
    const tsFiles = getAllFiles(folderPath, ".ts");
    this.logger.log(
      `Extracting identifiers from ${tsFiles.length} TypeScript files in ${folderPath}`
    );

    const results: CodeNodeEntity[] = [];
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
