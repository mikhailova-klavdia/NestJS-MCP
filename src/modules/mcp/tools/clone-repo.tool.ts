import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { GitService } from 'src/modules/git/git.service';
import { z } from 'zod';

@Injectable()
export class CloneRepositoryTool {
  constructor(private readonly _gitService: GitService) {}

  @Tool({
    name: 'cloneRepository',
    description: 'Clones a Git repo (optionally via SSH key) and extracts code identifiers',
    parameters: z.object({
      repoUrl: z.string().url(),
      projectName: z.string().min(1),
      sshKey: z.string().optional(),
    }),
  })
  async run(
    params: { repoUrl: string; projectName: string; sshKey?: string },
    context: Context,
  ) {
    const { project, path } = await this._gitService.cloneRepository(
      params.repoUrl,
      params.projectName,
      params.sshKey,
    );
    await this._gitService.processRepository(project, path);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Repository "${params.projectName}" cloned and processed at "${path}".`,
        },
      ],
    };
  }
}

