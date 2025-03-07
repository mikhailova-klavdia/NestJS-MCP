import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TasksService } from './../src/tasks/tasks.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const tasksServiceMock = {
    getAllTasks: () => [
      { id: 1, title: 'Test Task 1', description: 'Desc 1', status: 'OPEN' },
      { id: 2, title: 'Test Task 2', description: 'Desc 2', status: 'DONE' },
    ],
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TasksService)
      .useValue(tasksServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/GET tasks', () => {
    return request(app.getHttpServer())
      .get('/tasks')
      .expect(200)
      .expect(tasksServiceMock.getAllTasks());
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
