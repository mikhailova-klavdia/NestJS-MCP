import * as ts from "typescript";
import { findImports } from "./import-finder";
import { ImportDeclarationInfo } from "../types/types";

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
