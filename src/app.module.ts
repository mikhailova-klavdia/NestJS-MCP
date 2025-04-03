import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks/tasks.service';
import { TasksController } from './tasks/tasks.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataModule } from './data.module';
import { RagModule } from './rag/rag.module';
import { ChatService } from './chat/chat.service';
import { DocumentService } from './document/document.service';
import { EmbeddingService } from './embedding/embedding.service';
import { DocumentModule } from './document/document.module';
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
