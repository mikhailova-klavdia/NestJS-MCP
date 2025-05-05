import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Param,
  Patch,
  Delete,
} from "@nestjs/common";
import { GitService } from "./git.service";
import { WebhookDto } from "./dto/webhook.dto";

class CloneDto {
  repoUrl: string;
  projectName: string;
  sshKey?: string;
}

@Controller("git")
export class GitController {
  constructor(private readonly gitService: GitService) {}

  @Post("clone")
  async cloneRepo(@Body() body: CloneDto) {
    const { repoUrl, projectName } = body;

    if (!repoUrl || !projectName) {
      throw new BadRequestException("repoUrl and projectName are required");
    }

    try {
      const { project, path } = await this.gitService.cloneRepository(
        body.repoUrl,
        body.projectName
      );
      await this.gitService.processRepository(project, path);
      return { message: "Repository cloned & processed successfully", path };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  /** Create a GitHub webhook and save its ID */
  @Post(":projectId/webhook")
  async createWebhook(
    @Param("projectId") projectId: string,
    @Body() dto: WebhookDto
  ) {
    if (!dto.callbackUrl) {
      throw new BadRequestException("callbackUrl is required");
    }
    return this.gitService.createWebhook(
      projectId,
      dto.callbackUrl,
      dto.secret,
      dto.events
    );
  }

  /** Update that webhook on GitHub */
  @Patch(":projectId/webhook")
  async updateWebhook(
    @Param("projectId") projectId: string,
    @Body() dto: WebhookDto
  ) {
    if (!dto.callbackUrl) {
      throw new BadRequestException("callbackUrl is required");
    }
    return this.gitService.updateWebhook(
      projectId,
      dto.callbackUrl,
      dto.secret,
      dto.events
    );
  }

  /** Delete the GitHub webhook */
  @Delete(":projectId/webhook")
  async deleteWebhook(@Param("projectId") projectId: string) {
    await this.gitService.deleteWebhook(projectId);
    return { message: "Webhook removed from GitHub and database" };
  }
}
