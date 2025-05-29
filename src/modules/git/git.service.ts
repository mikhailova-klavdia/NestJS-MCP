import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { simpleGit, DiffResult } from "simple-git";
import * as path from "path";
import * as fs from "fs";
import { Raw, Repository } from "typeorm";
import { ProjectEntity } from "../project/project.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { EmbedConfig } from "../../embedding-config";
import { CodeNodeExtractor } from "../identifiers/code-node-constructor";
import { CodeNodeEntity } from "../identifiers/entities/code-node.entity";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { CodeEdgeEntity } from "../identifiers/entities/code-edge.entity";
import * as os from "os";
import e from "express";

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

  /**
   * Extracts project identifiers from a Git repository URL.
   *
   * @param repoUrl - URL of the Git repository
   * @param projectName  - Name of the project to be created
   * @param sshKey - Optional SSH key for authentication
   *
   * @returns {ProjectEntity} - The created project entity with identifiers extracted
   */
  async extractProjectIdentifiers(
    repoUrl: string,
    projectName: string,
    sshKey?: string
  ) {
    const projectPath = path.join(
      this._basePath,
      `${projectName}.git-${Date.now()}`
    );
    const tmpDir = path.join(os.tmpdir(), projectPath);
    fs.mkdirSync(tmpDir, { recursive: true });
    const git = simpleGit(tmpDir);

    // set up SSH key if needed
    let keyPath: string | undefined;
    if (sshKey) {
      keyPath = path.join(tmpDir, "id_rsa");
      fs.writeFileSync(keyPath, sshKey, { mode: 0o600 });
      process.env.GIT_SSH_COMMAND = `ssh -i ${keyPath} -o StrictHostKeyChecking=no`;
    }

    // this will populate tmpDir with files
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

  /**
   * clones a Git repository to the local filesystem.
   *
   * @param repoUrl - URL of the Git repository to clone
   * @param projectName - Name of the project to be created
   * @param sshKey - Optional SSH key for authentication
   *
   * @returns {ProjectEntity} - The created project entity with the cloned repository
   */
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

  /**
   * Processes a Git repository by extracting identifiers and edges from its files.
   *
   * @param project - The project entity to process
   * @param folderPathOverride - Optional override for the folder path to scan
   *
   * @returns {ProjectEntity} - The processed project entity with identifiers and edges saved
   */
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

  /**
   * Processes a batch of code nodes by embedding their identifiers and saving them.
   *
   * @param batch - Array of CodeNodeEntity to process
   * @param project - The project entity to associate with the nodes
   */
  async processBatchOfCodeNodes(
    batch: CodeNodeEntity[],
    project: ProjectEntity
  ) {
    const embeddings = await this._embeddingService.embedBatch(
      batch.map((n) => n.identifier)
    );

    for (let i = 0; i < batch.length; i++) {
      const node = batch[i];
      const vec = embeddings[i];
      const literal = `[${vec.join(",")}]`; // e.g. "[0.0128,-0.0254,…]"

      await this._nodeRepo
        .createQueryBuilder()
        .update(CodeNodeEntity)
        .set({
          project: project,
          // here we inline the pgvector literal directly:
          embedding: () => `'${literal}'::vector`,
        })
        .where("id = :id", { id: node.id })
        .execute();
    }
  }

  /**
   * Saves a batch of code edges to the database.
   *
   * @param batch - Array of CodeEdgeEntity to save
   */
  async saveBatchOfEdges(batch: CodeEdgeEntity[]) {
    await this._edgeRepo.save(batch);
  }

  /**
   * polls a Git repository for changes and processes any new commits.
   *
   * @param projectId - ID of the project to poll
   */
  async pollProject(projectId: number) {
    const project = await this._projectRepo.findOneBy({ id: projectId });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    let workdir = project.localPath;
    let cleanupTemp = false;
    let git;

    if (workdir && fs.existsSync(workdir)) {
      git = simpleGit(workdir);
    } else {
      // make a temporary clone
      workdir = path.join(os.tmpdir(), `repo-${project.name}-${Date.now()}`);
      fs.mkdirSync(workdir, { recursive: true });
      cleanupTemp = true;

      git = simpleGit(workdir);
      await git.init();
      await git.addRemote("origin", project.repoUrl);

      await git.fetch("origin", project.lastProcessedCommit);
      await git.fetch("origin", "main");
      await git.checkout(["-f", "origin/main"]);
    }

    const remoteHead = (await git.revparse(["origin/main"])).trim();
    if (remoteHead === project.lastProcessedCommit) {
      if (cleanupTemp) fs.rmSync(workdir, { recursive: true, force: true });
      return;
    }

    // retrieve the diff summary between the last processed commit and the current HEAD
    const diff: DiffResult = await git.diffSummary([
      `${project.lastProcessedCommit}..${remoteHead}`,
    ]);
    this._logger.log(
      `Changed files: ${diff.files.map((f) => f.file).join(", ")}`
    );

    // for each changed file, we need to re-extract identifiers and edges
    for (const file of diff.files) {
      const relPath = file.file;
      const absPath = path.join(workdir, relPath);

      // Remove any old nodes for this path
      await this._nodeRepo
        .createQueryBuilder()
        .delete()
        .where("projectId = :pid", { pid: project.id })
        .andWhere("filePath = :file", { file: relPath })
        .execute();

      // Re-extract identifiers & edges
      let identifiers: CodeNodeEntity[] = [];
      let edges: CodeEdgeEntity[] = [];

      if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
        ({ identifiers, edges } =
          await this._extractor.getIdentifiersFromFolder(relPath));
      } else if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
        ({ identifiers, edges } =
          await this._extractor.getIdentifiersFromFolder(absPath));
      } else {
        continue;
      }

      // Enqueue them in batches
      await this.enqueueBatches(identifiers, edges, project);
    }

    project.lastProcessedCommit = remoteHead;
    await this._projectRepo.save(project);
    if (cleanupTemp) fs.rmSync(workdir, { recursive: true, force: true });
  }

  /**
   * finds a project by its ID.
   *
   * @param id  - ID of the project to find
   *
   * @returns  {ProjectEntity} - The found project entity
   */
  async findProjectById(id: number): Promise<ProjectEntity> {
    const project = await this._projectRepo.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project #${id} not found`);
    }
    return project;
  }

  /**
   * Enqueues batches of code nodes and edges for processing.
   *
   * @param identifiers - Array of CodeNodeEntity to process
   * @param edges - Array of CodeEdgeEntity to process
   * @param project - The project entity to associate with the nodes and edges
   */
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

  async findByUrl(repoUrl: string): Promise<ProjectEntity | null> {
    return this._projectRepo.findOne({ where: { repoUrl } });
  }
}
