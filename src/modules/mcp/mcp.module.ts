import { Module } from '@nestjs/common';
import { GitModule } from '../git/git.module';
import {
  McpTransportType,
  McpModule as RekogMcpModule,
} from '@rekog/mcp-nest';
import { McpToolsModule } from './tools/tool.module';

@Module({
  providers: [McpToolsModule],

  imports: [RekogMcpModule.forRoot({
    name: 'mcp-server',
    version: '1.0.0',
    transport: [McpTransportType.STREAMABLE_HTTP],
    streamableHttp: {
      enableJsonResponse: true,
      sessionIdGenerator: () => "1",//() => crypto.randomUUID(),
      statelessMode: false,
    },
    mcpEndpoint: "mcp",
  }),
  GitModule],
  controllers: [],
})
export class McpModule {}
