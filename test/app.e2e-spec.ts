import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { Task } from 'src/modules/tasks/task.entity';
import { NotFoundException } from '@nestjs/common';

let tasksList: Task[] = [];

const tasksServiceMock = {
  createTask: (title: string, description: string): Task => {
    const newTask: Task = {
      id: tasksList.length + 1,
      title,
      description,
      status: 'OPEN',
    };
    tasksList.push(newTask);
    return newTask;
  },
  getAllTasks: (): Task[] => tasksList,
  getTaskById: (id: number): Task => {
    const task = tasksList.find((t) => t.id === id);
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  },
  deleteTask: (id: number): void => {
    tasksList = tasksList.filter((t) => t.id !== id);
  },
  updateTaskStatus: (id: number, status: 'OPEN' | 'DONE'): Task => {
    const task = tasksList.find((t) => t.id === id);
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    task.status = status;
    return task;
  },
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    tasksList = [];
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

  // Generic Test
  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // Test for /tasks
  it('/GET tasks - get all tasks', () => {
    return request(app.getHttpServer())
      .get('/tasks')
      .expect(200)
      .expect(tasksServiceMock.getAllTasks());
  });

  // Tests for CRUD operations
  it('POST /tasks - create a new task', async () => {
    const payload = { title: 'New Task', description: 'Task description' };
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({
      id: 1,
      title: 'New Task',
      description: 'Task description',
      status: 'OPEN',
    });
  });

  it('GET /tasks/:id - get a task by id', async () => {
    tasksServiceMock.createTask('Task 1', 'Description 1');

    const response = await request(app.getHttpServer())
      .get('/tasks/1')
      .expect(200);

    expect(response.body).toEqual({
      id: 1,
      title: 'Task 1',
      description: 'Description 1',
      status: 'OPEN',
    });
  });

  it('PUT /tasks/:id/status - update a tasks status', async () => {
    tasksServiceMock.createTask('Task 1', 'Description 1');

    const payload = { status: 'DONE' };

    const response = await request(app.getHttpServer())
      .put('/tasks/1/status')
      .send(payload)
      .expect(200);

    expect(response.body).toEqual({
      id: 1,
      title: 'Task 1',
      description: 'Description 1',
      status: 'DONE',
    });
  });

  it('DELETE /tasks/:id - delete a task', async () => {
    tasksServiceMock.createTask('Task 1', 'Description 1');

    await request(app.getHttpServer()).delete('/tasks/1').expect(200);

    await request(app.getHttpServer()).get('/tasks/1').expect(404);
  });
});
