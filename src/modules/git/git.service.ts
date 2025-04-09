import { Injectable } from '@nestjs/common';
import { simpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EmbeddingService } from './embedding.service';
import { IdentifierExtractorService } from '../identifiers/identifier-extractor.service';
import { IdentifierEntity } from '../identifiers/identifier.entity';

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
    const project = new ProjectEntity();
    project.name = projectName;

    await this._projectRepo.save(project);

    // get identifiers from files cloned
    const rawIdentifiers = this._extractor.getIdentifiersFromFolder(projectPath);
    const identifiersToSave: IdentifierEntity[] = [];

    const batchSize = 50;

    for (let i = 0; i < rawIdentifiers.length; i += batchSize) {
      const batch = rawIdentifiers.slice(i, i + batchSize);

      const embeddedBatch = await Promise.all(
        batch.map(async (ident) => {
          const embedding = await this._embeddingService.embed(ident.name);
          const entity = new IdentifierEntity();
          entity.identifier = ident.name;
          entity.context = ident.context || 'unknown';
          entity.filePath = ident.filePath || '';
          entity.codeSnippet = ident.codeSnippet || '';
          entity.embedding = embedding;
          entity.project = project;
          return entity;
        })
      );

      identifiersToSave.push(...embeddedBatch);

      console.log(
        `🔄 Processed ${Math.min(i + batchSize, rawIdentifiers.length)} / ${rawIdentifiers.length}`
      );
    }

    // save all identifiers in one batch
    await this._identifierRepo.save(identifiersToSave);

    return projectPath;
  }
}
