import * as fs from "fs";
import * as path from "path";

/**
 * Recursively retrieves all files with a specific extension from a directory.
 * @param dir - the directory to search in
 * @param extension - the file extension to look for 
 * @param files - an array to store the found files  
 * @returns string[] - an array of file paths with the specified extension
 */
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
