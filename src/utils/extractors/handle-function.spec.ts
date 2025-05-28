import * as ts from "typescript";
import { createEdge, handleIdentifier } from "./code-node-handler";
import { findDependenciesInNode } from "./import-finder";
import type { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import type { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { RelationshipType } from "../types/context";
import { handleFunctionMethod } from "./handle-function";

jest.mock("./code-node-handler", () => ({
  ...jest.requireActual("./code-node-handler"),
  handleIdentifier: jest.fn(),
  createEdge: jest.fn(),
}));
jest.mock("./import-finder", () => ({ findDependenciesInNode: jest.fn() }));

const handleIdMock = handleIdentifier as jest.MockedFunction<
  typeof handleIdentifier
>;
const createEdgeMock = createEdge as jest.MockedFunction<typeof createEdge>;
const findDepsMock = findDependenciesInNode as jest.MockedFunction<
  typeof findDependenciesInNode
>;

const FOLDER = "/path";
const FILE = "/path/file.ts";

function getFunctionNode(code: string): ts.FunctionDeclaration {
  const sf = ts.createSourceFile(FILE, code, ts.ScriptTarget.Latest, true);
  return sf.statements.find(ts.isFunctionDeclaration)!;
}

describe("handleFunctionMethod", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("extracts function and parameter identifiers without source", () => {
    const code = "function foo(a, b) {}";
    const node = getFunctionNode(code);

    const funcEntity = {
      id: "f",
      identifier: "foo",
      filePath: FILE,
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;
    const paramA = {
      id: "a",
      identifier: "a",
      filePath: FILE,
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;
    const paramB = {
      id: "b",
      identifier: "b",
      filePath: FILE,
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;
    handleIdMock
      .mockReturnValueOnce(funcEntity)
      .mockReturnValueOnce(paramA)
      .mockReturnValueOnce(paramB);

    findDepsMock.mockReturnValue([
      {
        moduleName: "mod",
        namedImports: ["X"],
        codeSnippet: 'import X from "mod";',
      },
    ]);
 
    createEdgeMock.mockImplementation(
      (src, tgt, rel) =>
        ({ source: src, target: tgt, relType: rel }) as CodeEdgeEntity
    );

    const { identifiers, edges } = handleFunctionMethod(
      node,
      FOLDER,
      FILE,
      [],
      undefined
    );

    // identifiers: function + 2 params
    expect(identifiers).toEqual([funcEntity, paramA, paramB]);
    // function dependencies set
    expect(funcEntity.context.dependencies).toEqual(
      findDepsMock.mock.results[0].value
    );

    // edges: only parameters
    expect(edges).toHaveLength(2);
    expect(createEdgeMock).toHaveBeenCalledWith(
      funcEntity,
      paramA,
      RelationshipType.PARAMETER
    );
    expect(createEdgeMock).toHaveBeenCalledWith(
      funcEntity,
      paramB,
      RelationshipType.PARAMETER
    );
  });

  it("includes method edge when source is provided", () => {
    const code = "function foo(x) {}";
    const node = getFunctionNode(code);

    const funcEntity = {
      id: "f",
      identifier: "foo",
      filePath: FILE,
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;
    const paramX = {
      id: "x",
      identifier: "x",
      filePath: FILE,
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;
    const sourceEntity = {
      id: "s",
      identifier: "Source",
      filePath: "/src.ts",
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;

    handleIdMock.mockReturnValueOnce(funcEntity).mockReturnValueOnce(paramX);

    findDepsMock.mockReturnValue([]);
    createEdgeMock.mockImplementation(
      (src, tgt, rel) =>
        ({ source: src, target: tgt, relType: rel }) as CodeEdgeEntity
    );

    const { identifiers, edges } = handleFunctionMethod(
      node,
      FOLDER,
      FILE,
      [],
      sourceEntity
    );

    // identifiers: function + param
    expect(identifiers).toEqual([funcEntity, paramX]);
    // edges: method + parameter
    expect(edges).toHaveLength(2);
    expect(createEdgeMock).toHaveBeenCalledWith(
      sourceEntity,
      funcEntity,
      RelationshipType.METHOD
    );
    expect(createEdgeMock).toHaveBeenCalledWith(
      funcEntity,
      paramX,
      RelationshipType.PARAMETER
    );
  });
});
