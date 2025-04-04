import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class IdentifierExtractorService {
  private readonly logger = new Logger(IdentifierExtractorService.name);

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
  private extractIdentifiersFromFile(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const identifiers: string[] = [];

    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) ||
        ts.isImportClause(node) ||
        ts.isImportSpecifier(node)
      ) {
        return;
      }

      if (ts.isIdentifier(node)) {
        identifiers.push(node.text);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return identifiers;
  }

  /**
   * Extracts identifiers from a single file, embeds each identifier using the EmbeddingService,
   * and logs the embedding vectors.
   *
   * @param filePath - The absolute path to the TypeScript file.
   */
  async extractFromFile(filePath: string): Promise<void> {
    const identifiers = this.extractIdentifiersFromFile(filePath);
    this.logger.log(`Found ${identifiers.length} identifiers in ${filePath}`);

    for (const identifier of identifiers) {
      try {
        const embedding = await this._embeddingService.embed(identifier);
        this.logger.debug(`Embedding for "${identifier}": ${embedding}`);
      } catch (err) {
        this.logger.error(`Failed to embed "${identifier}":`, err);
      }
    }
  }

  /**
   * Recursively processes all `.ts` files in a directory, extracting and embedding identifiers from each file.
   *
   * @param folderPath - The absolute path to the folder containing TypeScript files.
   */
  async extractFromFolder(folderPath: string): Promise<void> {
    const tsFiles = this.getAllFiles(folderPath, '.ts');
    this.logger.log(`Processing ${tsFiles.length} .ts files in folder: ${folderPath}`);

    for (const file of tsFiles) {
      await this.extractFromFile(file);
    }
  }
}
