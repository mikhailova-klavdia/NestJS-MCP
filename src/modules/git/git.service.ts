import { Injectable } from "@nestjs/common";
import { simpleGit } from "simple-git";
import * as path from "path";
import * as fs from "fs";
import { Repository } from "typeorm";
import { ProjectEntity } from "../project/project.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { EmbedConfig } from "../../embedding-config";
import { CodeNodeExtractorService } from "../identifiers/code-node-constructor";
import { CodeNodeEntity } from "../identifiers/code-node.entity";

@Injectable()
export class GitService {
  private readonly _basePath = "documents/";

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly _projectRepo: Repository<ProjectEntity>,

    @InjectRepository(CodeNodeEntity)
    private readonly _identifierRepo: Repository<CodeNodeEntity>,

    private readonly _extractor: CodeNodeExtractorService,

    private readonly _embeddingService: EmbedConfig
  ) {
    if (!fs.existsSync(this._basePath)) {
      fs.mkdirSync(this._basePath, { recursive: true });
    }
  }

  async cloneRepository(
    repoUrl: string, 
    projectName: string,
    sshKey?: string
  ) {
    const projectPath = path.join(this._basePath, projectName);
    const git = simpleGit();

    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }

    // if an sshKey is provided, use it for authentication
    let keyPath: string | undefined;
    if (sshKey) {
      fs.mkdirSync(path.dirname(projectPath), { recursive: true });
      keyPath = path.join(this._basePath, `${projectName}_id_rsa`);
      fs.writeFileSync(keyPath, sshKey, { mode: 0o600 });
      process.env.GIT_SSH_COMMAND = `ssh -i ${keyPath} -o StrictHostKeyChecking=no`;
    }

    await git.clone(repoUrl, projectPath);

    // cleanup env and temp key 
    if (keyPath) {
      delete process.env.GIT_SSH_COMMAND;
      fs.unlinkSync(keyPath);
    }

    // create and save the project entity
    const project = new ProjectEntity();
    project.name = projectName;
    project.repoUrl = repoUrl;

    await this._projectRepo.save(project);
    return { project, path: projectPath };
  }

  async processRepository(project: ProjectEntity, projectPath: string) {
    // get identifiers from files cloned
    const rawIdentifiers =
      this._extractor.getIdentifiersFromFolder(projectPath);
    const identifiersToSave: CodeNodeEntity[] = [];

    const batchSize = 50;

    for (let i = 0; i < rawIdentifiers.length; i += batchSize) {
      const batch = rawIdentifiers.slice(i, i + batchSize);

      const embeddedBatch = await Promise.all(
        batch.map(async (ident) => {
          const embedding = await this._embeddingService.embed(ident.name);
          const entity = new CodeNodeEntity();
          entity.identifier = ident.name;
          entity.filePath = ident.filePath || "";
          entity.embedding = embedding;
          entity.project = project;
          entity.context = ident.context || {
            declarationType: null,
            codeSnippet: "",
            entryPoints: [],
          };
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
