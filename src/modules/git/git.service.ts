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
import { CodeNodeExtractor } from "../identifiers/code-node-constructor";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class GitService {
  private readonly _basePath = "documents/";

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly _projectRepo: Repository<ProjectEntity>,

    @InjectRepository(CodeNodeEntity)
    private readonly _identifierRepo: Repository<CodeNodeEntity>,

    private readonly _extractor: CodeNodeExtractor,

    private readonly _embeddingService: EmbedConfig,

    @InjectQueue("code-embedding")
    private readonly embeddingQueue: Queue
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
    return project;
  }

  async processRepository(project: ProjectEntity) {
    // get identifiers from files cloned
    const { identifiers, edges} = this._extractor.getIdentifiersFromFolder(
      project.localPath
    );
    const batchSize = 50;

    for (let i = 0; i < identifiers.length; i += batchSize) {
      const batch = identifiers.slice(i, i + batchSize);

      await this.embeddingQueue.add(
        "batch",
        { batch, project },
        { removeOnComplete: true }
      );

      console.log(
        `🔄 Enqueued ${Math.min(i + batchSize, identifiers.length)} / ${identifiers.length}`
      );
    }

    return project;
  }

  async processBatchOfCodeNodes(batch: CodeNodeEntity[], project: ProjectEntity) {
    const embeddedBatch = await Promise.all(
      batch.map(async (codeNode) => {
        const embedding = await this._embeddingService.embed(
          codeNode.identifier
        );

        codeNode.embedding = embedding;
        codeNode.project = project;

        return codeNode;
      })
    );

    await this._identifierRepo.save(embeddedBatch);
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

      const { identifiers, edges} = this._extractor.getIdentifiersFromFolder(absPath);
      
      const batchSize = 50;

      for (let i = 0; i < identifiers.length; i += batchSize) {
        const batch = identifiers.slice(i, i + batchSize);

        await this.embeddingQueue.add(
          "batch",
          { batch, project },
          { removeOnComplete: true }
        );

        console.log(
          `🔄 Enqueued ${Math.min(i + batchSize, identifiers.length)} / ${identifiers.length}`
        );
      }
    }

    project.lastProcessedCommit = remoteHead;
    await this._projectRepo.save(project);
  }

  async findProjectById(id: number): Promise<ProjectEntity> {
    const project = await this._projectRepo.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project #${id} not found`);
    }
    return project;
  }
}
