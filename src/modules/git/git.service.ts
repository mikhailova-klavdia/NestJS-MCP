import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { simpleGit, DiffResult } from "simple-git";
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

  async cloneRepository(repoUrl: string, projectName: string, sshKey?: string) {
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
    const initialSha = (await simpleGit(projectPath).revparse(["HEAD"])).trim();
    // cleanup env and temp key
    if (keyPath) {
      delete process.env.GIT_SSH_COMMAND;
      fs.unlinkSync(keyPath);
    }

    // create and save the project entity
    const project = new ProjectEntity();
    project.name = projectName;
    project.repoUrl = repoUrl;
    project.localPath = projectPath;
    project.lastProcessedCommit = initialSha;

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

  async pollProject(projectId: number) {
    const project = await this._projectRepo.findOneBy({ id: projectId });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    
    if (!project.localPath) {
      throw new BadRequestException("No local clone");
    }
    const git = simpleGit(project.localPath);

    await git.fetch("origin", "main");

    const remoteHead = (await git.revparse(["origin/main"])).trim();

    if (remoteHead === project.lastProcessedCommit) {
      return;
    }

    // get the diff between the last processed commit and the remote head
    const diff: DiffResult = await git.diffSummary([
      `${project.lastProcessedCommit}..${remoteHead}`,
    ]);

    console.log("Differences:", diff);

    for (const file of diff.files) {
      const relPath = file.file;
      const absPath = path.join(project.localPath, relPath);

      // delete identifiers if the file was changed or deleted
      await this._identifierRepo
        .createQueryBuilder()
        .delete()
        .where("projectId = :pid", { pid: project.id })
        .andWhere("filePath = :file", { file: relPath })
        .execute();

      await this._identifierRepo.delete({ project, filePath: relPath });

      const rawIdentifiers = this._extractor.getIdentifiersFromFolder(absPath);
      // …and save back into the database
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
    }

    project.lastProcessedCommit = remoteHead;
    await this._projectRepo.save(project);
  }
}
