import { Injectable, OnModuleInit } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { GitService } from 'src/modules/git/git.service';

@Injectable()
export class McpService implements OnModuleInit {
  private server: McpServer;
  public transport: StreamableHTTPServerTransport;

  constructor(private readonly _gitService: GitService) {}

  async onModuleInit() {
    this.server = new McpServer({
      name: 'NestJSMCP',
      version: '1.0.0',
    });

    this.server.tool(
      'echo',
      {
        inputSchema: { text: z.string() },
        description: 'Echoes back the provided text.',
      },
      async ({ text }) => ({
        content: [{ type: 'text', text: `You said: ${text}` }],
      })
    );

    // tool for cloning a git repository
    this.server.tool(
      'cloneRepository',
      {
        inputSchema: {
          repoUrl:     z.string().url(),
          projectName: z.string().min(1),
          sshKey:      z.string().optional(),
        },
        description:
          'Clones a Git repo (optionally via SSH key) and extracts code identifiers',
      },
      async ({ repoUrl, projectName, sshKey }) => {
        const { project, path } = await this._gitService.cloneRepository(
          repoUrl, projectName, sshKey,
        );
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

    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
    });

    await this.server.connect(this.transport);
    console.log('MCP server is running');
  }
}