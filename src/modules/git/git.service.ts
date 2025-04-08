import { Injectable } from '@nestjs/common';
import { simpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';

@Injectable()
export class GitService {
  private readonly _basePath = 'documents/';
  private readonly _projectRepo: Repository<ProjectEntity>

  constructor() {
    if (!fs.existsSync(this._basePath)) {
      fs.mkdirSync(this._basePath, { recursive: true });
    }
  }

  async cloneRepository(repoUrl: string, projectName: string): Promise<string> {
    const projectPath = path.join(this._basePath, projectName);
    const git = simpleGit();

    if (fs.existsSync(projectPath)) {
      throw new Error(`Project folder "${projectName}" already exists.`);
    }

    await git.clone(repoUrl, projectPath);

    // save the project entity
    const project = this._projectRepo.create({
      name: projectName,
    });

    this._projectRepo.save(project);
    return projectPath;
  }
}
