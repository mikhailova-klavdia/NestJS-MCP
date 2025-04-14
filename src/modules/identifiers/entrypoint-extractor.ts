import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { EntryPoint } from './code-node.entity';

export function findIdentifierUsages(identifier: string, folderPath: string): EntryPoint[] {
  const usages: EntryPoint[] = [];

  function getFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getFiles(fullPath));
      } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        results.push(fullPath);
      }
    });

    return results;
  }

  const files = getFiles(folderPath);

  for (const filepath of files) {
    const fileContent = fs.readFileSync(filepath, 'utf-8');

    const sourceFile = ts.createSourceFile(filepath, fileContent, ts.ScriptTarget.Latest, true);

    function traverse(node: ts.Node) {
      if (ts.isIdentifier(node) && node.text === identifier) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const fileLines = fileContent.split('\n');
        const snippet = fileLines[line].trim();
        usages.push({ filepath: filepath, codeSnippet: snippet });
      }
      ts.forEachChild(node, traverse);
    }

    traverse(sourceFile);
  }

  return usages;
}
