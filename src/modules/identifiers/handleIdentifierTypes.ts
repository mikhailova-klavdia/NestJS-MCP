import * as ts from "typescript";
import { findEntryPoints } from "src/utils/import-finder";
import { CodeEdgeEntity } from "./entities/code-edge.entity";
import { CodeNodeEntity } from "./entities/code-node.entity";

export function handleFunctionDeclaration(
  node: ts.Node,
  folderPath: string,
  filePath: string
) {
  const identifiers: CodeNodeEntity[] = [];
  const edges: CodeEdgeEntity[] = [];

  if (ts.isFunctionDeclaration(node) && node.name) {
    const nodeContext = this.getDeclarationType(node);
    const entryPoints = findEntryPoints(node.name.text, folderPath, filePath);

    const identifier = new CodeNodeEntity();

    identifier.identifier = node.name.text;
    identifier.context = {
      declarationType: nodeContext.declarationType,
      codeSnippet: nodeContext.codeSnippet,
      entryPoints: entryPoints,
      importRequirements: null,
    };
    identifier.filePath = filePath;

    identifiers.push(identifier);

    node.parameters.forEach((param) => {
      if (ts.isIdentifier(param.name)) {
        const paramContext = this.getDeclarationType(param);
        const paramEntryPoints = findEntryPoints(
          param.name.text,
          folderPath,
          filePath
        );

        const paramIdentifier = new CodeNodeEntity();

        paramIdentifier.identifier = param.name.text;
        paramIdentifier.context = {
          declarationType: nodeContext.declarationType,
          codeSnippet: nodeContext.codeSnippet,
          entryPoints: entryPoints,
          importRequirements: null,
        };
        paramIdentifier.filePath = filePath;

        identifiers.push(paramIdentifier);
      }
    });
  }
}
