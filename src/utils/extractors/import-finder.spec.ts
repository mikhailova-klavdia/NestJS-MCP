import * as ts from "typescript";
import { findImports, findUsagePoints } from "./import-finder";
import { ImportDeclarationInfo } from "../types/types";
import * as fs from "fs";
import { getAllFiles } from "../files";
import { handleIdentifier } from "./code-node-handler";
import { UsagePoint } from "../types/context";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";

jest.mock("fs");
jest.mock("../files");
jest.mock("./code-node-handler");

const fsMock = fs as jest.Mocked<typeof fs>;
const filesMock = getAllFiles as jest.MockedFunction<typeof getAllFiles>;
const handlerMock = handleIdentifier as jest.MockedFunction<
  typeof handleIdentifier
>;

describe("findImports()", () => {
  function makeSourceFile(code: string): ts.SourceFile {
    return ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
  }

  it("should return an empty array when there are no imports", () => {
    const src = `
      const x = 42;
      function foo() { return x; }
    `;
    const result = findImports(makeSourceFile(src));
    expect(result).toEqual([]);
  });

  it("should pick up a default import", () => {
    const src = `import DefaultExport from './moduleA';`;
    const [imp] = findImports(makeSourceFile(src)) as ImportDeclarationInfo[];

    expect(imp.moduleName).toBe("./moduleA");
    expect(imp.namedImports).toEqual(["DefaultExport"]);
    expect(imp.codeSnippet).toBe(`import DefaultExport from './moduleA';`);
  });

  it("should pick up named imports", () => {
    const src = `
      import { A, B as AliasB,   C } from "my-lib";
    `;
    const [imp] = findImports(makeSourceFile(src)) as ImportDeclarationInfo[];

    expect(imp.moduleName).toBe("my-lib");
    expect(imp.namedImports).toEqual(["A", "AliasB", "C"]);
    expect(imp.codeSnippet).toBe(
      `import { A, B as AliasB,   C } from "my-lib";`
    );
  });

  it("should pick up namespace imports", () => {
    const src = `import * as NS from 'namespace-mod';`;
    const [imp] = findImports(makeSourceFile(src)) as ImportDeclarationInfo[];

    expect(imp.moduleName).toBe("namespace-mod");
    expect(imp.namedImports).toEqual(["NS"]);
    expect(imp.codeSnippet).toBe(`import * as NS from 'namespace-mod';`);
  });

  it("handles multiple imports in one file", () => {
    const src = `
      import Foo from 'foo';
      import { X, Y } from "bar";
      import * as All from "baz";
    `;
    const imps = findImports(makeSourceFile(src));

    expect(imps).toHaveLength(3);

    expect(imps[0]).toMatchObject({
      moduleName: "foo",
      namedImports: ["Foo"],
      codeSnippet: `import Foo from 'foo';`,
    });
    expect(imps[1]).toMatchObject({
      moduleName: "bar",
      namedImports: ["X", "Y"],
      codeSnippet: `import { X, Y } from "bar";`,
    });
    expect(imps[2]).toMatchObject({
      moduleName: "baz",
      namedImports: ["All"],
      codeSnippet: `import * as All from "baz";`,
    });
  });
});

describe("findUsagePoints()", () => {
  const FOLDER = "/project";
  const DECL_FILE = "/project/decl.ts";

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("skips the declaration file entirely", () => {
    filesMock.mockReturnValue([DECL_FILE, "/project/other.ts"]);
    fsMock.readFileSync.mockReturnValue(`const x = 1;`);

    const { usages, subClasses } = findUsagePoints("Foo", FOLDER, DECL_FILE);
    expect(usages).toHaveLength(0);
    expect(subClasses).toHaveLength(0);
    expect(filesMock).toHaveBeenCalledWith(FOLDER, "ts");
  });

  it("returns a default-import usage", () => {
    filesMock.mockReturnValue(["/project/file1.ts"]);
    fsMock.readFileSync.mockReturnValue(`
      import Foo from './mod';
      const x = Foo();
    `);

    const { usages, subClasses } = findUsagePoints("Foo", FOLDER, DECL_FILE);
    expect(subClasses).toEqual([]);
    expect(usages).toHaveLength(1);

    const usage = usages[0] as UsagePoint;
    expect(usage.filepath).toBe("/project/file1.ts");
    expect(usage.codeSnippet).toBe("const x = Foo();");
  });

  it("returns a named-import usage", () => {
    filesMock.mockReturnValue(["/project/file2.ts"]);
    fsMock.readFileSync.mockReturnValue(`
      import { Foo, Bar } from 'lib';
      function test() {
        return Foo + Bar;
      }
    `);

    const { usages } = findUsagePoints("Foo", FOLDER, DECL_FILE);
    expect(usages).toHaveLength(1);
    expect(usages[0].filepath).toBe("/project/file2.ts");
    expect(usages[0].codeSnippet).toContain("return Foo + Bar;");
  });

  it("detects a subclass via extends and includes the subclass node", () => {
    filesMock.mockReturnValue(["/project/file3.ts"]);
    fsMock.readFileSync.mockReturnValue(`
      import Foo from 'base';
      class SubClass extends Foo {
        method() {}
      }
    `);

    const fakeNode: CodeNodeEntity = {
      id: "sub-1",
      identifier: "SubClass",
      filePath: "/project/file3.ts",
      declarationType: "class",
      context: { codeSnippet: "class SubClass extends Foo { method() {} }" },
    } as any;
    handlerMock.mockReturnValue(fakeNode);

    const { usages, subClasses } = findUsagePoints("Foo", FOLDER, DECL_FILE);

    expect(subClasses).toEqual([]);

    expect(usages).toHaveLength(2);
    const subclassUsage = usages.find((u) => (u as any).subclass === fakeNode);
    expect(subclassUsage).toBeDefined();
    expect(subclassUsage!.filepath).toBe("/project/file3.ts");
    expect((subclassUsage as any).subclass).toBe(fakeNode);
    expect(subclassUsage!.codeSnippet).toBe(fakeNode.context.codeSnippet);
  });
});
