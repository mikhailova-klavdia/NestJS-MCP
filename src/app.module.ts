import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './modules/tasks/tasks.service';
import { TasksController } from './modules/tasks/tasks.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataModule } from './data.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatService } from './modules/chat/chat.service';
import { DocumentService } from './modules/document/document.service';
import { EmbeddingService } from './modules/embedding/embedding.service';
import { DocumentModule } from './modules/document/document.module';
import { CountryImporter } from './scripts/load-documents';

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
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'indexing',
    }),
    DataModule,
    RagModule,
    DocumentModule,
  ],
  controllers: [AppController, TasksController],
  providers: [
    AppService,
    TasksService,
    DocumentService,
    ChatService,
    EmbeddingService,
    CountryImporter,
  ],
})
export class AppModule {}
