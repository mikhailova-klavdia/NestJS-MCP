import { Injectable } from '@nestjs/common';
import { simpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GitService {
  private readonly basePath = 'documents/';

  constructor() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async cloneRepository(repoUrl: string, projectName: string): Promise<string> {
    const projectPath = path.join(this.basePath, projectName);
    const git = simpleGit();

    if (fs.existsSync(projectPath)) {
      throw new Error(`Project folder "${projectName}" already exists.`);
    }

    await git.clone(repoUrl, projectPath);
    return projectPath;
  }
}
