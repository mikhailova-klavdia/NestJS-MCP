import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Patch,
  Param,
} from "@nestjs/common";
import { GitService } from "./git.service";
import { CloneDto } from "./dto/git.dto";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";

@Controller("git")
export class GitController {
  constructor(
    private readonly _gitService: GitService,
    @InjectQueue("code-indexing") private readonly _indexQueue: Queue
  ) {}

  @Post("process")
  async processRepo(@Body() body: CloneDto) {
    const { repoUrl, projectName, sshKey } = body;
    if (!repoUrl || !projectName) {
      throw new BadRequestException("repoUrl and projectName are required");
    }

    try {
      const project = await this._gitService.extractProjectIdentifiers(
        repoUrl,
        projectName,
        sshKey
      );
      // no need for a second queue here, it's all enqueued in enqueueBatches()
      return {
        message: "Repository streamed & processed successfully",
        project,
      };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Post("clone")
  async cloneRepo(@Body() body: CloneDto) {
    const { repoUrl, projectName } = body;

    if (!repoUrl || !projectName) {
      throw new BadRequestException("repoUrl and projectName are required");
    }

    try {
      const project = await this._gitService.cloneRepository(
        body.repoUrl,
        body.projectName
      );

      await this._indexQueue.add("index", { projectId: project.id });

      return {
        message: "Repository cloned & processed successfully",
        project,
      };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Patch(":projectId/poll")
  async pollProject(@Param("projectId") projectId: number) {
    await this._gitService.pollProject(projectId);
    return { message: `Project ${projectId} polled successfully` };
  }
}
