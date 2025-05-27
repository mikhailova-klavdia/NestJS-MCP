import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { GitController } from '../src/modules/git/git.controller';
import { GitService } from '../src/modules/git/git.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

describe('GitController (e2e)', () => {
  let app: INestApplication;
  let gitService: GitService;
  let indexQueue: Queue;

  const fakeProject = {
    id: 123,
    name: 'my-proj',
    repoUrl: 'https://git.example.com/foo.git',
    localPath: '/tmp/foo',
    lastProcessedCommit: 'abcdef',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [GitController],
      providers: [
        {
          provide: GitService,
          useValue: {
            extractProjectIdentifiers: jest.fn().mockResolvedValue(fakeProject),
            cloneRepository: jest.fn().mockResolvedValue(fakeProject),
            pollProject: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getQueueToken('code-indexing'),
          useValue: { add: jest.fn() } as Partial<Queue>,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    gitService = moduleFixture.get(GitService);
    indexQueue = moduleFixture.get<Queue>(getQueueToken('code-indexing'));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/git/process (POST)', () => {
    it('400 when missing required fields', () => {
      return request(app.getHttpServer())
        .post('/git/process')
        .send({})
        .expect(400);
    });

    it('201 and returns message + project on success', () => {
      return request(app.getHttpServer())
        .post('/git/process')
        .send({ repoUrl: 'https://git.example.com/foo.git', projectName: 'my-proj', sshKey: 'KEYDATA' })
        .expect(201)
        .expect(res => {
          expect(gitService.extractProjectIdentifiers).toHaveBeenCalledWith(
            'https://git.example.com/foo.git',
            'my-proj',
            'KEYDATA'
          );
          expect(res.body).toEqual({
            message: 'Repository streamed & processed successfully',
            project: fakeProject,
          });
        });
    });
  });

  describe('/git/clone (POST)', () => {
    it('400 when missing required fields', () => {
      return request(app.getHttpServer())
        .post('/git/clone')
        .send({ repoUrl: 'https://git.example.com/foo.git' })
        .expect(400);
    });

    it('201, enqueues and returns project on success', () => {
      return request(app.getHttpServer())
        .post('/git/clone')
        .send({ repoUrl: 'https://git.example.com/foo.git', projectName: 'my-proj' })
        .expect(201)
        .expect(res => {
          expect(gitService.cloneRepository).toHaveBeenCalledWith(
            'https://git.example.com/foo.git',
            'my-proj'
          );
          expect(indexQueue.add).toHaveBeenCalledWith('index', { projectId: fakeProject.id });
          expect(res.body).toEqual({
            message: 'Repository cloned & processed successfully',
            project: fakeProject,
          });
        });
    });
  });

  describe('/git/:projectId/poll (PATCH)', () => {
    it('200 when polling existing project', () => {
      return request(app.getHttpServer())
        .patch(`/git/${fakeProject.id}/poll`)
        .expect(200)
        .expect({ message: `Project ${fakeProject.id} polled successfully` })
        .then(() => {
          expect(gitService.pollProject).toHaveBeenCalledWith(fakeProject.id);
        });
    });
  });
});
