import { Injectable, OnModuleInit } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z } from 'zod';
import { GitService } from '../git/git.service';

@Injectable()
export class McpService implements OnModuleInit {
  private server: McpServer;

  constructor(private readonly _gitService: GitService) {}

  async onModuleInit() {
    this.server = new McpServer({
      name: 'NestJSMCP',
      version: '1.0.0',
    });

    this.server.tool(
      'echo',
      'Echoes back the provided text.',
      { text: z.string() },
      async ({ text }) => {
        return { content: [{ type: 'text', text: `You said: ${text}` }] };
      }
    );

    // tool for cloning a git repository
    this.server.tool(
      'cloneRepository',
      'Clones a Git repo (optionally via SSH key) and extracts code identifiers',
      {
        repoUrl:      z.string().url(),
        projectName:  z.string().min(1),
        sshKey:       z.string().optional(),
      },
      async ({ repoUrl, projectName, sshKey }) => {
        // clone + optional SSH
        const { project, path } = await this._gitService.cloneRepository(
          repoUrl,
          projectName,
          sshKey,
        );
        
        // extract & embed identifiers
        await this._gitService.processRepository(project, path);

        return {
          content: [
            {
              type: 'text',
              text: `✅ Repository "${projectName}" cloned and processed at "${path}".`,
            },
          ],
        };
      },
    );

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('NestJS MCP Server started.');
  }
}