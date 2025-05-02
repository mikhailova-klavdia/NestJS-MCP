import { Module } from '@nestjs/common';
import { EchoTool } from './echo.tool';

@Module({
  providers: [EchoTool],
  exports: [EchoTool],
})
export class McpToolsModule {}
