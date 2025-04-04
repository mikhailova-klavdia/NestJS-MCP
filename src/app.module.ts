import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DataModule } from "./data.module";
import { RagModule } from "./modules/rag/rag.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { DocumentModule } from "./modules/document/document.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DocumentService } from "./modules/document/document.service";
import { ChatService } from "./modules/chat/chat.service";
import { EmbeddingService } from "./modules/embedding/embedding.service";
import { CountryImporter } from "./scripts/load-documents";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST"),
          port: configService.get<number>("REDIS_PORT") || 6379,
        },
      }),
    }),
    BullModule.registerQueue({
      name: "indexing",
    }),
    DataModule,
    RagModule,
    TasksModule,
    DocumentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DocumentService,
    ChatService,
    EmbeddingService,
    CountryImporter,
  ],
})
export class AppModule {}
