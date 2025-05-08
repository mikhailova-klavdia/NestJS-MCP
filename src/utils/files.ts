import * as fs from "fs";
import * as path from "path";

export function getAllFiles(
  dir: string,
  extension: string,
  files: string[] = []
): string[] {
  // if a file gets passed, return the file path
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) {
    if (dir.endsWith(extension)) {
      files.push(dir);
    }
    return files;
  }

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, extension, files);
    } else if (fullPath.endsWith(extension)) {
      files.push(fullPath);
    }
  }
  return files;
}
