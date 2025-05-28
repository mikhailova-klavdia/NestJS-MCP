import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule } from "@nestjs/config";
import { DataModule } from "./data.module";
import { RagModule } from "./modules/rag/rag.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ChatService } from "./modules/chat/chat.service";
import { GitModule } from "./modules/git/git.module";
import { IdentifierModule } from "./modules/identifiers/identifier.module";
import { McpModule } from "./modules/mcp/mcp.module";
import { ProjectModule } from "./modules/project/project.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue({ name: "code-indexing" }),
    DataModule,
    RagModule,
    GitModule,
    IdentifierModule,
    McpModule,
    AppModule,
    ProjectModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChatService],
})
export class AppModule {}
