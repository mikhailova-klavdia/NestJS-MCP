import { Injectable, OnModuleInit } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z } from 'zod';

@Injectable()
export class McpService implements OnModuleInit {
  private server: McpServer;

  async onModuleInit() {
    this.server = new McpServer({
      name: 'NestJSMCP',
      version: '1.0.0',
    });

    this.server.tool(
      'echo',
      z.object({ text: z.string() }),
      async ({ text }) => {
        return { content: [{ type: 'text', text: `You said: ${text}` }] };
      },
      { description: 'Echoes back the provided text.' },
    );

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('NestJS MCP Server started.');
  }
}