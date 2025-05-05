import { Module } from "@nestjs/common";
import { GitModule } from "../git/git.module";
import { McpTransportType, McpModule as RekogMcpModule } from "@rekog/mcp-nest";
import { EchoTool } from "./tools/echo.tool";
import { GreetingTool } from "./tools/greetings.tool";
import { RagTool } from "./tools/rag.tool";

@Module({
  providers: [EchoTool, GreetingTool, RagTool],
  imports: [
    RekogMcpModule.forRoot({
      name: "mcp-server",
      version: "1.0.0",
      transport: [
        McpTransportType.STREAMABLE_HTTP,
        McpTransportType.SSE,
      ],
      
      streamableHttp: {
        enableJsonResponse: true,
        sessionIdGenerator: () => "1", //() => crypto.randomUUID(),
        statelessMode: false,
      },
      

    }),
    GitModule,
  ],
})
export class McpModule {}
