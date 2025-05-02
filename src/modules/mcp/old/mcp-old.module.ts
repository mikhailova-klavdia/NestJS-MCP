import { Module } from '@nestjs/common';
import { GitModule } from 'src/modules/git/git.module';
import { McpOldController } from './mcp-old.controller';
import { McpService } from './mcp.service';


@Module({
  providers: [McpService],
  imports: [GitModule],
  controllers: [McpOldController],
})
export class McpModuleOld {}
