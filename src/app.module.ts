import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './tasks/task.entity';
import { TasksService } from './tasks/tasks.service';
import { TasksController } from './tasks/tasks.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LangchainService } from './langchain/langchain.service';
import { DataModule } from './data.module';

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
  ],
  controllers: [AppController, TasksController],
  providers: [AppService, TasksService, LangchainService],
})
export class AppModule {}
