import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import * as ts from "typescript";
import { v4 as uuidv4 } from "uuid";
import { RelationshipType } from "../types/context";
import { handleIdentifier, createEdge } from "./code-node-handler";
import { findUsagePoints } from "./import-finder";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

jest.mock("./import-finder", () => ({
  findUsagePoints: jest.fn(),
}));

/**
 * Utility: walk the AST to find the first Identifier with given text
 */
function findIdentifierNode(
  source: ts.SourceFile,
  name: string
): ts.Identifier | undefined {
  let found: ts.Identifier | undefined;
  function visit(node: ts.Node) {
    if (ts.isIdentifier(node) && node.text === name) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

describe("handleIdentifier", () => {
  const FOLDER = "/some/folder";
  const FILE = "/some/folder/test.ts";

  beforeEach(() => {
    jest.resetAllMocks();
    (uuidv4 as jest.Mock).mockReturnValue("test-uuid");
  });

  it("should handle a non-exported identifier without calling findUsagePoints", () => {
    const srcText = `const foo = 42;`;
    const source = ts.createSourceFile(
      "test.ts",
      srcText,
      ts.ScriptTarget.ES2015,
      true
    );
    const idNode = findIdentifierNode(source, "foo")!;
    const node = handleIdentifier(idNode, FOLDER, FILE)!;

    expect(node).toBeInstanceOf(CodeNodeEntity);
    expect(node.id).toBe("test-uuid");
    expect(node.identifier).toBe("foo");
    expect(node.filePath).toBe(FILE);

    expect(node.declarationType).toBe("VariableDeclaration");
    expect(node.context.codeSnippet).toContain(" foo = 42");

    expect(findUsagePoints).not.toHaveBeenCalled();
    expect(node.context.usages).toEqual([]);
  });

  it("should handle an exported identifier and include usages", () => {
    (findUsagePoints as jest.Mock).mockReturnValue({
      usages: ["/some/other/file.ts:10"],
      subClasses: [],
    });

    const srcText = `export function bar() {}`;
    const source = ts.createSourceFile(
      "test.ts",
      srcText,
      ts.ScriptTarget.ES2015,
      true
    );
    const idNode = findIdentifierNode(source, "bar")!;
    const node = handleIdentifier(idNode, FOLDER, FILE)!;

    expect(node).toBeInstanceOf(CodeNodeEntity);
    expect(node.id).toBe("test-uuid");
    expect(node.identifier).toBe("bar");
    expect(node.declarationType).toBe("FunctionDeclaration");
    expect(node.context.codeSnippet).toContain("export function bar()");
    expect(findUsagePoints).toHaveBeenCalledWith("bar", FOLDER, FILE);
    expect(node.context.usages).toEqual(["/some/other/file.ts:10"]);
  });

  it("should return undefined for non-Identifier nodes", () => {
    const source = ts.createSourceFile(
      "test.ts",
      `42;`,
      ts.ScriptTarget.ES2015,
      true
    );
    const literal = source.statements[0].getChildAt(0);
    const result = handleIdentifier(literal, FOLDER, FILE);
    expect(result).toBeUndefined();
  });
});

describe("createEdge", () => {
  it("should create a CodeEdgeEntity linking source → target with the given RelationshipType", () => {
    const src = new CodeNodeEntity();
    const tgt = new CodeNodeEntity();
    const edge = createEdge(src, tgt, RelationshipType.METHOD);

    expect(edge).toBeInstanceOf(CodeEdgeEntity);
    expect(edge.source).toBe(src);
    expect(edge.target).toBe(tgt);
    expect(edge.relType).toBe(RelationshipType.METHOD);
  });
});
