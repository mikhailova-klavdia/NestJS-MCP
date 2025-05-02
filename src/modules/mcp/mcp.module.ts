import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { GitModule } from '../git/git.module';

@Module({
  providers: [McpService],
  imports: [GitModule],
})
export class McpModule {}
