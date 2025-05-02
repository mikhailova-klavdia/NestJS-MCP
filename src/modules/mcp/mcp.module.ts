import { Module } from '@nestjs/common';
import { GitModule } from '../git/git.module';
import {
  McpTransportType,
  McpModule as RekogMcpModule,
} from '@rekog/mcp-nest';
import { EchoTool } from './tools/echo.tool';
import { CloneRepositoryTool } from './tools/clone-repo.tool';
import { GreetingTool } from './tools/greetings.tool';

@Module({
  providers: [GreetingTool, EchoTool, CloneRepositoryTool],
  imports: [RekogMcpModule.forRoot({
    name: 'mcp-server',
    version: '1.0.0',
    transport: [McpTransportType.STREAMABLE_HTTP],
    streamableHttp: {
      enableJsonResponse: true,
      sessionIdGenerator: () => crypto.randomUUID(),
      statelessMode: false,
    },
    mcpEndpoint: "mcp",
    capabilities: {
      tools: {
        name: 'echo',
        description: 'Echoes back the given input',
        params: [{ name: 'message', schema: { type: 'string' } }],
        result: { schema: { type: 'string' } }
      },
    },
  }),
  GitModule],
  controllers: [],
})
export class McpModule {}
