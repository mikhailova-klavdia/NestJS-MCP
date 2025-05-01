import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { GitService } from './git.service';

@Controller('git')
export class GitController {
  constructor(private readonly gitService: GitService) {}

  @Post('clone')
  async cloneRepo(@Body() body: { repoUrl: string; projectName: string }) {
    const { repoUrl, projectName } = body;

    if (!repoUrl || !projectName) {
      throw new BadRequestException('repoUrl and projectName are required');
    }

    try {
      const { project, path } = await this.gitService.cloneRepository(body.repoUrl, body.projectName);
      await this.gitService.processRepository(project, path);
      return { message: 'Repository cloned & processed successfully', path };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
