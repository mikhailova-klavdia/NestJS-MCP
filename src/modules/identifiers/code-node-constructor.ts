import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as ts from "typescript";
import { getAllFiles } from "src/utils/files";
import { CodeNodeEntity } from "./entities/code-node.entity";
import {
  handleClassAndInterfaceAndEnumDeclaration,
  handleFunctionAndMethodDeclaration,
} from "./code-node-handler";
import { CodeEdgeEntity } from "./entities/code-edge.entity";
import { CodeGraph } from "src/utils/types";

@Injectable()
export class CodeNodeExtractor {
  private readonly logger = new Logger(CodeNodeExtractor.name);
  /**
   * Extracts all identifier tokens from a given TypeScript file, excluding identifiers from import declarations.
   */
  private extractIdentifiersFromFile(
    filePath: string,
    folderPath: string
  ): CodeGraph {
    const content = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    const identifiers: CodeNodeEntity[] = [];
    const edges: CodeEdgeEntity[] = [];

    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) ||
        ts.isImportClause(node) ||
        ts.isImportSpecifier(node)
      ) {
        return;
      }

      // Class declarations
      if (ts.isClassDeclaration(node)|| ts.isInterfaceDeclaration(node)) {
        const { extractedIdentifiers, extractedEdges } = handleClassAndInterfaceAndEnumDeclaration(
          node,
          folderPath,
          filePath
        );
        identifiers.push(...extractedIdentifiers);
        edges.push(...extractedEdges);
      }
      // Functions / Methods
      else if (ts.isFunctionDeclaration(node)) {
        const { extractedIdentifiers, extractedEdges } =
          handleFunctionAndMethodDeclaration(node, folderPath, filePath);
        identifiers.push(...extractedIdentifiers);
        edges.push(...extractedEdges);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return { identifiers, edges };
  }

  /**
   * Scans the given folder recursively, reads all `.ts` files,
   * extracts identifiers from each, and returns a list of identifier data.
   */
  getIdentifiersFromFolder(folderPath: string): CodeGraph {
    const tsFiles = getAllFiles(folderPath, ".ts");
    this.logger.log(
      `Extracting identifiers from ${tsFiles.length} TypeScript files in ${folderPath}`
    );

    const identifiers: CodeNodeEntity[] = [];
    const edges: CodeEdgeEntity[] = [];

    let count = 0;

    for (const file of tsFiles) {
      // pull out each file’s nodes + edges
      const { identifiers: fileIds, edges: fileEdges } =
        this.extractIdentifiersFromFile(file, folderPath);

      // merge into our accumulators
      identifiers.push(...fileIds);
      edges.push(...fileEdges);

      this.logger.log(`Processed ${++count} / ${tsFiles.length} files`);
    }

    this.logger.log(
      `✅ Finished extracting ${identifiers.length} identifiers from ${tsFiles.length} files.`
    );

    return { identifiers, edges };
  }
}
