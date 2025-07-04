import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as ts from "typescript";
import { getAllFiles } from "src/utils/files";
import { CodeNodeEntity } from "./entities/code-node.entity";
import { CodeEdgeEntity } from "./entities/code-edge.entity";
import { findImports } from "src/utils/extractors/import-finder";
import { handleIdentifier } from "src/utils/extractors/code-node-handler";
import {
  processClass,
  processEnum,
} from "src/utils/extractors/handle-class-enums";
import { handleFunctionMethod } from "src/utils/extractors/handle-function";
import { CodeGraph, Extracted } from "src/utils/types/types";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class CodeNodeExtractor {
  private readonly _logger = new Logger(CodeNodeExtractor.name);

  constructor(
    @InjectRepository(CodeNodeEntity)
    private readonly _nodeRepo: Repository<CodeNodeEntity>
  ) {}

  /**
   * Extracts all identifier tokens from a given TypeScript file.
   */
  private async _extractIdentifiersFromFile(
    filePath: string,
    folderPath: string
  ): Promise<CodeGraph> {
    const content = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    const imports = findImports(sourceFile);

    const visit = async (node: ts.Node): Promise<Extracted> => {
      const identifiers: CodeNodeEntity[] = [];
      const edges: CodeEdgeEntity[] = [];
      // Class declarations
      if (
        (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        node.name
      ) {
        const { identifiers: extractedIdentifiers, edges: extractedEdges } =
          await processClass(node, folderPath, filePath, imports, this._nodeRepo);
        identifiers.push(...extractedIdentifiers);
        edges.push(...extractedEdges);
      }
      // enums
      else if (ts.isEnumDeclaration(node) && node.name) {
        const { identifiers: extractedIdentifiers, edges: extractedEdges } =
          processEnum(node, folderPath, filePath, imports);
        identifiers.push(...extractedIdentifiers);
        edges.push(...extractedEdges);
      }
      // Variables, types
      else if (
        (ts.isVariableDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
        node.name
      ) {
        const variableIdentifier = handleIdentifier(node, folderPath, filePath);
        if (variableIdentifier) {
          identifiers.push(variableIdentifier);
        }
      }
      // Functions / Methods
      else if (ts.isFunctionDeclaration(node)) {
        const { identifiers: extractedIdentifiers, edges: extractedEdges } =
          handleFunctionMethod(node, folderPath, filePath, imports);
        identifiers.push(...extractedIdentifiers);
        edges.push(...extractedEdges);
      }

      for (const child of node.getChildren()) {
        const { identifiers: cIds, edges: cEs } = await visit(child);
        identifiers.push(...cIds);
        edges.push(...cEs);
      }

      return { identifiers, edges };
    };

    const { identifiers, edges } = await visit(sourceFile);
    return { identifiers, edges };
  }

  /**
   * Scans the given folder recursively, reads all typescript files,
   * extracts identifiers from each, and returns a list of identifier data.
   */
  async getIdentifiersFromFolder(folderPath: string): Promise<CodeGraph> {
    const tsFiles = getAllFiles(folderPath, ".ts");
    this._logger.log(
      `Extracting identifiers from ${tsFiles.length} TypeScript files in ${folderPath}`
    );

    const identifiers: CodeNodeEntity[] = [];
    const edges: CodeEdgeEntity[] = [];

    let count = 0;

    for (const file of tsFiles) {
      // pull out each file’s nodes + edges
      const { identifiers: fileIds, edges: fileEdges } =
        await this._extractIdentifiersFromFile(file, folderPath);

      // merge into our accumulators
      identifiers.push(...fileIds);
      edges.push(...fileEdges);

      this._logger.log(`Processed ${++count} / ${tsFiles.length} files`);
    }

    this._logger.log(
      `✅ Finished extracting ${identifiers.length} identifiers from ${tsFiles.length} files.`
    );

    return { identifiers, edges };
  }
}
