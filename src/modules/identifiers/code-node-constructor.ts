import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ContextV1, EntryPoint } from './code-node.entity';

@Injectable()
export class CodeNodeExtractorService {
  private readonly logger = new Logger(CodeNodeExtractorService.name);
  /**
   * Recursively collects all files with the specified extension from a directory and its subdirectories.
   */
  private getAllFiles(dir: string, extension: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        this.getAllFiles(fullPath, extension, files);
      } else if (fullPath.endsWith(extension)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  /**
   * Extracts all identifier tokens from a given TypeScript file, excluding identifiers from import declarations.
   */
  private extractIdentifiersFromFile(filePath: string, folderPath: string): ExtractedIdentifier[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const identifiers: ExtractedIdentifier[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isImportClause(node) || ts.isImportSpecifier(node)) {
        return;
      }

      if (ts.isIdentifier(node)) {
        // grab identifier context
        const nodeContext = this.getDeclarationType(node);
        const entryPoints = this.findEntryPoints(node.text, folderPath, filePath);

        identifiers.push({
          name: node.text,
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
    const tsFiles = this.getAllFiles(folderPath, '.ts');
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

  findEntryPoints(
    identifier: string,
    folderPath: string,
    identifierDeclationFile: string
  ): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];
    const files = this.getAllFiles(folderPath, 'ts');

    files.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

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
            if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
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

    this.logger.log(`Found ${entryPoints.length} entry point(s) for identifier "${identifier}"`);
    return entryPoints;
  }
}

type ExtractedIdentifier = {
  name: string;
  context?: ContextV1;
  filePath?: string;
  codeSnippet?: string;
  entryPoints?: EntryPoint[];
};
