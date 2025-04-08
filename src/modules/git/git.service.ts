import { Injectable } from '@nestjs/common';
import { simpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IdentifierExtractorService } from './identifier-extractor.service';
import { IdentifierEntity } from './identifier.entity';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class GitService {
  private readonly _basePath = 'documents/';

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly _projectRepo: Repository<ProjectEntity>,

    @InjectRepository(IdentifierEntity)
    private readonly _identifierRepo: Repository<IdentifierEntity>,

    private readonly _extractor: IdentifierExtractorService,

    private readonly _embeddingService: EmbeddingService
  ) {
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

    // create and save the project entity
    const project = this._projectRepo.create({
      name: projectName,
    });

    await this._projectRepo.save(project);

    // get identifiers from files cloned
    const rawIdentifiers = this._extractor.getIdentifiersFromFolder(projectPath);
    const identifiersToSave: IdentifierEntity[] = [];

    for (const ident of rawIdentifiers) {
      const embedding = await this._embeddingService.embed(ident.name);

      const identifier = new IdentifierEntity();
      identifier.identifier = ident.name;
      identifier.context = ident.context || 'unknown';
      identifier.filePath = ident.filePath || '';
      identifier.codeSnippet = ident.codeSnippet || '';
      identifier.embedding = embedding;
      identifier.projectId = project.id;

      identifiersToSave.push(identifier);
    }

    // 4. Save all identifiers in one batch
    await this._identifierRepo.save(identifiersToSave);

    return projectPath;
  }
}
