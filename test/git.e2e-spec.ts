import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { GitService } from "../src/modules/git/git.service";
import { getQueueToken } from "@nestjs/bullmq";
import { AppModule } from "src/app.module";
import { DataSource } from "typeorm";

jest.mock("bullmq", () => {
  const actual = jest.requireActual("bullmq");
  return {
    ...actual,
    Worker: class {
      constructor() {}
      on(event: string, listener: (...args: any[]) => void) {}
      close(): Promise<void> {
        return Promise.resolve();
      }
    },
  };
});

describe("GitController (e2e)", () => {
  let app: INestApplication;
  let gitService: jest.Mocked<GitService>;
  let indexQueue: { add: jest.Mock };
  let dataSource: DataSource;

  const fakeProject = {
    id: 123,
    name: "my-proj",
    repoUrl: "https://git.example.com/foo.git",
    localPath: "/tmp/foo",
    lastProcessedCommit: "abcdef",
  };

  beforeAll(async () => {
    const extractSpy = jest.fn().mockResolvedValue(fakeProject);
    const cloneSpy = jest.fn().mockResolvedValue(fakeProject);
    const pollSpy = jest.fn().mockResolvedValue(undefined);
    const findByUrlSpy = jest.fn().mockResolvedValue(null);
    const queueMock = { add: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GitService)
      .useValue({
        extractProjectIdentifiers: extractSpy,
        cloneRepository: cloneSpy,
        pollProject: pollSpy,
        findByUrl: findByUrlSpy,
      })
      .overrideProvider(getQueueToken("code-indexing"))
      .useValue(queueMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true })
    );
    await app.init();

    gitService = moduleFixture.get(GitService) as jest.Mocked<GitService>;
    indexQueue = moduleFixture.get(getQueueToken("code-indexing"));
    dataSource = app.get<DataSource>(DataSource);

    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe("POST /git/process", () => {
    it("400 when missing required fields", () => {
      return request(app.getHttpServer())
        .post("/git/process")
        .send({})
        .expect(400);
    });

    it("201 and returns message + project on success", () => {
      return request(app.getHttpServer())
        .post("/git/process")
        .send({
          repoUrl: fakeProject.repoUrl,
          projectName: fakeProject.name,
          sshKey: "KEYDATA",
        })
        .expect(201)
        .expect((res) => {
          expect(gitService.extractProjectIdentifiers).toHaveBeenCalledWith(
            fakeProject.repoUrl,
            fakeProject.name,
            "KEYDATA"
          );
          expect(res.body).toEqual({
            message: "Repository streamed & processed successfully",
            project: fakeProject,
          });
        });
    });
  });

  describe("POST /git/clone", () => {
    it("400 when missing required fields", () => {
      return request(app.getHttpServer())
        .post("/git/clone")
        .send({ repoUrl: fakeProject.repoUrl })
        .expect(400);
    });

    it("201, enqueues and returns project on success", () => {
      return request(app.getHttpServer())
        .post("/git/clone")
        .send({
          repoUrl: fakeProject.repoUrl,
          projectName: fakeProject.name,
        })
        .expect(201)
        .expect((res) => {
          expect(gitService.cloneRepository).toHaveBeenCalledWith(
            fakeProject.repoUrl,
            fakeProject.name
          );
          expect(indexQueue.add).toHaveBeenCalledWith("index", {
            projectId: fakeProject.id,
          });
          expect(res.body).toEqual({
            message: "Repository cloned & processed successfully",
            project: fakeProject,
          });
        });
    });
  });

  describe("PATCH /git/:projectId/poll", () => {
    it("200 when polling existing project", () => {
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
