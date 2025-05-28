import * as ts from "typescript";
import { Repository } from "typeorm";
import { handleFunctionMethod } from "./handle-function";
import { createEdge, handleIdentifier } from "./code-node-handler";
import { findDependenciesInNode } from "./import-finder";
import type { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import type { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";
import { RelationshipType } from "../types/context";
import { processClass, processEnum } from "./handle-class-enums";

jest.mock("./code-node-handler", () => ({
  ...jest.requireActual("./code-node-handler"),
  handleIdentifier: jest.fn(),
  createEdge: jest.fn(),
}));
jest.mock("./import-finder", () => ({ findDependenciesInNode: jest.fn() }));
jest.mock("./handle-function", () => ({ handleFunctionMethod: jest.fn() }));

const handleIdMock = handleIdentifier as jest.MockedFunction<
  typeof handleIdentifier
>;
const createEdgeMock = createEdge as jest.MockedFunction<typeof createEdge>;
const findDepsMock = findDependenciesInNode as jest.MockedFunction<
  typeof findDependenciesInNode
>;
const handleFnMock = handleFunctionMethod as jest.MockedFunction<
  typeof handleFunctionMethod
>;

describe("processClass", () => {
  const FOLDER = "/project";
  const FILE = "/project/file.ts";

  let repo: jest.Mocked<Repository<CodeNodeEntity>>;

  beforeEach(() => {
    jest.resetAllMocks();
    repo = {
      findOne: jest.fn(),
      save: jest.fn(async (ids) => ids as CodeNodeEntity[]),
    } as any;
  });

  function getClassNode(code: string) {
    const sf = ts.createSourceFile(FILE, code, ts.ScriptTarget.Latest, true);
    return sf.statements.find(ts.isClassDeclaration)!;
  }

  it("returns empty when no name or no identifier", async () => {
    const anon = ts.factory.createClassDeclaration(
      undefined,
      undefined,
      undefined,
      undefined,
      []
    );
    const result1 = await processClass(anon as any, FOLDER, FILE, [], repo);
    expect(result1).toEqual({ identifiers: [], edges: [] });

    const code = "class X {}";
    const node = getClassNode(code);
    handleIdMock.mockReturnValue(undefined);
    const result2 = await processClass(node, FOLDER, FILE, [], repo);
    expect(result2).toEqual({ identifiers: [], edges: [] });
  });

  it("processes subclasses, dependencies, methods, and properties", async () => {
    const code = `
      class MyClass {
        methodA(x) {}
        propA: number;
      }
    `;
    const node = getClassNode(code);

    const subclassEnt = {
      id: "sub",
      identifier: "Sub",
      filePath: FILE,
      declarationType: "class",
      context: { dependencies: [], codeSnippet: "", usages: [] },
    } as CodeNodeEntity;

    const classEnt = {
      id: "cls",
      identifier: "MyClass",
      filePath: FILE,
      declarationType: "class",
      context: {
        dependencies: [],
        codeSnippet: "",
        usages: [{ subclass: subclassEnt, filepath: FILE, codeSnippet: "" }],
      },
    } as CodeNodeEntity;

    const methodEnt = {
      id: "m",
      identifier: "methodA",
      filePath: FILE,
      declarationType: "method",
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;

    const propEnt = {
      id: "p",
      identifier: "propA",
      filePath: FILE,
      declarationType: "property",
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;

    // handleIdentifier
    handleIdMock.mockReturnValueOnce(classEnt).mockReturnValueOnce(propEnt);

    repo.findOne.mockResolvedValue(null);
    findDepsMock.mockReturnValue([
      { moduleName: "imp", namedImports: [], codeSnippet: "" },
    ]);

    // handleFunctionMethod returns one methodEnt + its METHOD edge
    handleFnMock.mockReturnValue({
      identifiers: [methodEnt],
      edges: [
        {
          id: 1,
          source: classEnt,
          target: methodEnt,
          relType: RelationshipType.METHOD,
        },
      ],
    });

    createEdgeMock.mockImplementation(
      (src, tgt, rel) =>
        ({
          id: rel === RelationshipType.SUBCLASS ? 2 : 3,
          source: src,
          target: tgt,
          relType: rel,
        }) as CodeEdgeEntity
    );

    const res = await processClass(node, FOLDER, FILE, [], repo);

    // identifiers should include subclass, class, method, and property
    expect(res.identifiers).toEqual(
      expect.arrayContaining([subclassEnt, classEnt, methodEnt, propEnt])
    );

    // edges: SUBCLASS, METHOD, PROPERTY
    expect(res.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: classEnt,
          target: subclassEnt,
          relType: RelationshipType.SUBCLASS,
        }),
        expect.objectContaining({
          source: classEnt,
          target: methodEnt,
          relType: RelationshipType.METHOD,
        }),
        expect.objectContaining({
          source: classEnt,
          target: propEnt,
          relType: RelationshipType.PROPERTY,
        }),
      ])
    );

    expect(repo.findOne).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });
});

describe("processEnum", () => {
  const FOLDER = "/project";
  const FILE = "/project/enum.ts";

  function getEnumNode(code: string) {
    const sf = ts.createSourceFile(FILE, code, ts.ScriptTarget.Latest, true);
    return sf.statements.find(ts.isEnumDeclaration)!;
  }

  it("returns empty when handleIdentifier null", () => {
    const node = getEnumNode("enum E { A, B }");
    handleIdMock.mockReturnValue(undefined);
    const result = processEnum(node, FOLDER, FILE, []);
    expect(result).toEqual({ identifiers: [], edges: [] });
  });

  it("extracts enum and members", () => {
    const node = getEnumNode("enum E { A, B }");
    const enumEnt = {
      id: "e",
      identifier: "E",
      filePath: FILE,
      declarationType: "enum",
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;
    const membA = {
      id: "a",
      identifier: "A",
      filePath: FILE,
      declarationType: "enum-member",
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;
    const membB = {
      id: "b",
      identifier: "B",
      filePath: FILE,
      declarationType: "enum-member",
      context: { dependencies: [], codeSnippet: "" },
    } as CodeNodeEntity;

    handleIdMock
      .mockReturnValueOnce(enumEnt)
      .mockReturnValueOnce(membA)
      .mockReturnValueOnce(membB);

    findDepsMock.mockReturnValue([
      { moduleName: "imp", namedImports: [], codeSnippet: "" },
    ]);
    createEdgeMock.mockImplementation(
      (src, tgt, rel) =>
        ({ source: src, target: tgt, relType: rel }) as CodeEdgeEntity
    );

    const result = processEnum(node, FOLDER, FILE, []);
    expect(result.identifiers).toEqual([enumEnt, membA, membB]);
    expect(result.edges).toEqual([
      { source: enumEnt, target: membA, relType: RelationshipType.ENUM_MEMBER },
      { source: enumEnt, target: membB, relType: RelationshipType.ENUM_MEMBER },
    ]);
  });
});
