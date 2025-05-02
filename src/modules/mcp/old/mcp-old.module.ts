import { Module } from '@nestjs/common';
import { GitModule } from 'src/modules/git/git.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';


@Module({
  providers: [McpService],
  imports: [GitModule],
  controllers: [McpController],
})
export class McpModuleOld {}
