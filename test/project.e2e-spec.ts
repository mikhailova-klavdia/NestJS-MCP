import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from 'src/modules/project/project.entity';
import { ProjectModule } from 'src/modules/project/project.module';

describe('ProjectController (e2e)', () => {
  let app: INestApplication;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [ProjectEntity],
          synchronize: true,
        }),
        ProjectModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /projects → []', () =>
    request(app.getHttpServer())
      .get('/projects')
      .expect(200)
      .expect([]));

  it('POST /projects → create one', () =>
    request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'Test', description: 'Desc', repoUrl: 'https://github.com' })
      .expect(201)
      .then((res) => {
        expect(res.body).toMatchObject({
          id: expect.any(String),
          name: 'Test',
          description: 'Desc',
          repoUrl: 'https://github.com',
        });
        projectId = res.body.id;
      }));

  it('GET /projects → [the one]', () =>
    request(app.getHttpServer())
      .get('/projects')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(projectId);
      }));

  it('GET /projects/:id → the project', () =>
    request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(200)
      .then((res) => {
        expect(res.body.id).toBe(projectId);
        expect(res.body.name).toBe('Test');
      }));

  it('PATCH /projects/:id → update name', () =>
    request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .send({ name: 'Updated' })
      .expect(200)
      .then((res) => {
        expect(res.body.id).toBe(projectId);
        expect(res.body.name).toBe('Updated');
      }));

  it('DELETE /projects/:id → 204 no content', () =>
    request(app.getHttpServer())
      .delete(`/projects/${projectId}`)
      .expect(204));

  it('GET /projects/:id after delete → 404', () =>
    request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(404));
});
