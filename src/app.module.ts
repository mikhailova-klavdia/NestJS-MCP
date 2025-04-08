import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataModule } from './data.module';
import { RagModule } from './modules/rag/rag.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatService } from './modules/chat/chat.service';
import { IdentifierImporter } from './scripts/load-identifiers-into-db';
import { GitModule } from './modules/git/git.module';

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
    TasksModule,
    GitModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChatService, IdentifierImporter],
})
export class AppModule {}
