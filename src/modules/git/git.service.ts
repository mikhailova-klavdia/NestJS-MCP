import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { simpleGit } from "simple-git";
import * as path from "path";
import * as fs from "fs";
import { Repository } from "typeorm";
import { ProjectEntity } from "../project/project.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { EmbedConfig } from "../../embedding-config";
import { CodeNodeExtractorService } from "../identifiers/code-node-constructor";
import { CodeNodeEntity } from "../identifiers/code-node.entity";
import axios from "axios";

@Injectable()
export class GitService {
  private readonly _basePath = "documents/";
  private readonly githubToken = process.env.GITHUB_TOKEN;

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

  async updateWebhook(
    projectId: string,
    callbackUrl: string,
    secret?: string,
    events: string[] = ["push"]
  ): Promise<ProjectEntity> {
    const project = await this._projectRepo.findOne({where: { id: projectId }});
    if (!project || !project.webhookId) {
      throw new NotFoundException(
        `No webhook registered for project ${projectId}`
      );
    }

    const match = project.repoUrl.match(
      /github\.com[:/](.+?)\/(.+?)(?:\.git)?$/
    );
    const [, owner, repo] = match!;

    await axios.patch(
      `https://api.github.com/repos/${owner}/${repo}/hooks/${project.webhookId}`,
      {
        config: {
          url: callbackUrl,
          content_type: "json",
          ...(secret ? { secret } : {}),
        },
        events,
        active: true,
      },
      {
        headers: {
          Authorization: `token ${this.githubToken}`,
          "User-Agent": "your-app-name",
        },
      }
    );

    return project;
  }

  async createWebhook(
    projectId: string,
    callbackUrl: string,
    secret?: string,
    events: string[] = ["push"]
  ): Promise<ProjectEntity> {
    const project = await this._projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const match = project.repoUrl.match(
      /github\.com[:/](.+?)\/(.+?)(?:\.git)?$/
    );
    const [, owner, repo] = match!;

    // create a webhook on GitHub
    const reponse = await axios.patch(
      `https://api.github.com/repos/${owner}/${repo}/hooks/${project.webhookId}`,
      {
        config: {
          url: callbackUrl,
          content_type: "json",
          ...(secret ? { secret } : {}),
        },
        events,
        active: true,
      },
      {
        headers: {
          Authorization: `token ${this.githubToken}`,
          "User-Agent": "your-app-name",
        },
      }
    );

    const hookId: number = reponse.data.id;
    project.webhookId = hookId;
    return this._projectRepo.save(project);
  }

  async deleteWebhook(projectId: string): Promise<void> {
    const project = await this._projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project || !project.webhookId) {
      throw new NotFoundException(
        `No webhook registered for project ${projectId}`
      );
    }

    const match = project.repoUrl.match(
      /github\.com[:/](.+?)\/(.+?)(?:\.git)?$/
    );
    const [, owner, repo] = match!;

    await axios.delete(
      `https://api.github.com/repos/${owner}/${repo}/hooks/${project.webhookId}`,
      {
        headers: {
          Authorization: `token ${this.githubToken}`,
          "User-Agent": "your-app-name",
        },
      }
    );

    project.webhookId = null;
    await this._projectRepo.save(project);
  }
}
