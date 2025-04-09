import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { EmbeddingService } from '../git/embedding.service';

@Injectable()
export class CodeNodeExtractorService {
  private readonly logger = new Logger(CodeNodeExtractorService.name);

  constructor(private readonly _embeddingService: EmbeddingService) {}

  /**
   * Recursively collects all files with the specified extension from a directory and its subdirectories.
   *
   * @param dir - The root directory to search.
   * @param extension - The file extension to filter by (e.g., '.ts').
   * @param files - (Optional) An accumulator array to hold the collected file paths.
   * @returns An array of file paths with the specified extension.
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
   *
   * @param filePath - The absolute path to the TypeScript file.
   * @returns An array of identifier strings found in the file.
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
        identifiers.push({
          name: node.text,
          context: node.parent ? ts.SyntaxKind[node.parent.kind] : 'unknown',
          filePath,
          codeSnippet: content.slice(node.getStart(), node.getEnd()),
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return identifiers;
  }

  /**
   * Scans the given folder recursively, reads all `.ts` files,
   * extracts identifiers from each, and returns a list of identifier data.
   *
   * @param folderPath - Absolute or relative path to the folder to scan.
   * @returns An array of objects each containing an identifier's name and code context.
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
}

type ExtractedIdentifier = {
  name: string;
  context?: string;
  filePath?: string;
  codeSnippet?: string;
};
