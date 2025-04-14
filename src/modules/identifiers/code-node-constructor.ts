import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { EmbeddingService } from '../git/embedding.service';
import { ContextV1, EntryPoint } from './code-node.entity';

@Injectable()
export class CodeNodeExtractorService {
  private readonly logger = new Logger(CodeNodeExtractorService.name);

  constructor(private readonly _embeddingService: EmbeddingService) {}

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
  private extractIdentifiersFromFile(filePath: string): ExtractedIdentifier[] {
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

        identifiers.push({
          name: node.text,
          context: {
            declarationType: nodeContext.declarationType,
            codeSnippet: nodeContext.codeSnippet,
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
    declarationType: ts.Declaration | null;
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
          declarationType: currentNode as ts.Declaration,
          codeSnippet: currentNode.getFullText(),
        };
      }
      currentNode = currentNode.parent;
    }

    return { declarationType: null, codeSnippet: node.getFullText() };
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
      const identifiers = this.extractIdentifiersFromFile(file);
      results.push(...identifiers);
      this.logger.log(`Processed ${++count} / ${tsFiles.length} files`);
    }

    this.logger.log(
      `✅ Finished extracting ${results.length} identifiers from ${tsFiles.length} files.`
    );

    return results;
  }

  private getClassEntryPoints(identifier: ts.Node): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];
    // based on import statement find where the class is used
    // and save the following for each entry point
    //   codeSnippet: string;
    //   filepath: string;
    return entryPoints;
  }

  private getMethodEntryPoints(identifier: ts.Node): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];
    // based on import statement find where a method Declaration is used
    // and save the following for each entry point
    //   codeSnippet: string;
    //   filepath: string;
    return entryPoints;
  }
}

type ExtractedIdentifier = {
  name: string;
  context?: ContextV1;
  filePath?: string;
  codeSnippet?: string;
};
