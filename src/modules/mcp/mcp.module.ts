import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { GitModule } from '../git/git.module';
import { McpController } from './mcp.controller';

@Module({
  providers: [McpService],
  imports: [GitModule],
  controllers: [McpController],
})
export class McpModule {}
