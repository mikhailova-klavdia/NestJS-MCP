import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json());
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.setGlobalPrefix('api', {
    exclude: ['sse','messages','mcp'],
  });
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
