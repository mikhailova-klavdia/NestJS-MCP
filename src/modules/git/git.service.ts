import {
  BadRequestException,
  Injectable,
  Logger,
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
import { CodeEdgeEntity } from "../identifiers/entities/code-edge.entity";
import * as os from "os";

@Injectable()
export class GitService {
  private readonly _basePath = "documents/";
  private readonly _logger = new Logger(CodeNodeExtractor.name);

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly _projectRepo: Repository<ProjectEntity>,

    @InjectRepository(CodeNodeEntity)
    private readonly _nodeRepo: Repository<CodeNodeEntity>,

    @InjectRepository(CodeEdgeEntity)
    private readonly _edgeRepo: Repository<CodeEdgeEntity>,

    private readonly _extractor: CodeNodeExtractor,

    private readonly _embeddingService: EmbedConfig,

    @InjectQueue("code-embedding")
    private readonly _embeddingQueue: Queue,

    @InjectQueue("edge-save")
    private readonly _edgeQueue: Queue
  ) {
    if (!fs.existsSync(this._basePath)) {
      fs.mkdirSync(this._basePath, { recursive: true });
    }
  }

  async extractProjectIdentifiers(
    repoUrl: string,
    projectName: string,
    sshKey?: string
  ) {
    const tmpDir = path.join(os.tmpdir(), `repo-${projectName}-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const git = simpleGit(tmpDir);

    // set up SSH key if needed
    let keyPath: string | undefined;
    if (sshKey) {
      keyPath = path.join(tmpDir, "id_rsa");
      fs.writeFileSync(keyPath, sshKey, { mode: 0o600 });
      process.env.GIT_SSH_COMMAND = `ssh -i ${keyPath} -o StrictHostKeyChecking=no`;
    }

    //this will populate tmpDir with files (depth=1 for minimal history)
    await git.clone(repoUrl, tmpDir);

    // grab the commit SHA
    const head = (await simpleGit(tmpDir).revparse(["HEAD"])).trim();

    // persist a project record so our queues get its ID
    const project = new ProjectEntity();
    project.name = projectName;
    project.repoUrl = repoUrl;
    project.localPath = tmpDir;
    project.lastProcessedCommit = head;
    await this._projectRepo.save(project);

    await this.processRepository(project, tmpDir);
    if (keyPath) {
      delete process.env.GIT_SSH_COMMAND;
      fs.unlinkSync(keyPath);
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    project.localPath = undefined;
    await this._projectRepo.save(project);

    return project;
  }

  async cloneRepository(repoUrl: string, projectName: string, sshKey?: string) {
    const projectPath = path.join(this._basePath, `${projectName}.git`);
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

  async processRepository(project: ProjectEntity, folderPathOverride?: string) {
    const folder = folderPathOverride ?? project.localPath;
    if (!folder) {
      throw new BadRequestException("No folder to scan");
    }

    // reuse our hardened getIdentifiersFromFolder
    const { identifiers, edges } =
      await this._extractor.getIdentifiersFromFolder(folder);

    const batchSize = 50;
    for (let i = 0; i < identifiers.length; i += batchSize) {
      const batch = identifiers.slice(i, i + batchSize);
      await this._nodeRepo.save(batch);
      await this._embeddingQueue.add(
        "batch",
        { batch, project },
        { removeOnComplete: true }
      );
      this._logger.log(
        `🔄 Enqueued ${Math.min(i + batchSize, identifiers.length)} / ${identifiers.length} identifiers`
      );
    }

    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      await this._edgeQueue.add(
        "save-edge-batch",
        { batch },
        { removeOnComplete: true }
      );
      this._logger.log(
        `🔄 Enqueued ${Math.min(i + batchSize, edges.length)} / ${edges.length} edges`
      );
    }

    return project;
  }

  async processBatchOfCodeNodes(
    batch: CodeNodeEntity[],
    project: ProjectEntity
  ) {
    const embeddings = await this._embeddingService.embedBatch(
      batch.map((node) => node.identifier)
    );

    const embeddedBatch = batch.map((codeNode, idx) => {
      codeNode.embedding = embeddings[idx];
      codeNode.project = project;
      return codeNode;
    });

    await this._nodeRepo.save(embeddedBatch);
  }

  async saveBatchOfEdges(batch: CodeEdgeEntity[]) {
    await this._edgeRepo.save(batch);
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
      await this._nodeRepo
        .createQueryBuilder()
        .delete()
        .where("projectId = :pid", { pid: project.id })
        .andWhere("filePath = :file", { file: relPath })
        .execute();

      await this._nodeRepo.delete({ project, filePath: relPath });

      const { identifiers, edges } =
        await this._extractor.getIdentifiersFromFolder(absPath);

      const batchSize = 50;

      for (let i = 0; i < identifiers.length; i += batchSize) {
        const batch = identifiers.slice(i, i + batchSize);

        await this._embeddingQueue.add(
          "batch",
          { batch, project },
          { removeOnComplete: true }
        );

        console.log(
          `🔄 Enqueued ${Math.min(i + batchSize, identifiers.length)} / ${identifiers.length}`
        );
      }

      for (let i = 0; i < edges.length; i += batchSize) {
        const batch = edges.slice(i, i + batchSize);

        await this._edgeQueue.add(
          "save-edge-batch",
          { batch },
          { removeOnComplete: true }
        );

        console.log(
          `🔄 Enqueued ${Math.min(i + batchSize, edges.length)} / ${edges.length} edges`
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

  private async enqueueBatches(
    identifiers: CodeNodeEntity[],
    edges: CodeEdgeEntity[],
    project: ProjectEntity
  ) {
    const batchSize = 50;

    for (let i = 0; i < identifiers.length; i += batchSize) {
      const batch = identifiers.slice(i, i + batchSize);
      await this._nodeRepo.save(batch);
      await this._embeddingQueue.add(
        "batch",
        { batch, project },
        { removeOnComplete: true }
      );
      console.log(
        `🔄 Enqueued ${Math.min(i + batchSize, identifiers.length)} / ${identifiers.length} identifiers`
      );
    }

    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      await this._edgeQueue.add(
        "save-edge-batch",
        { batch },
        { removeOnComplete: true }
      );
      console.log(
        `🔄 Enqueued ${Math.min(i + batchSize, edges.length)} / ${edges.length} edges`
      );
    }
  }
}
