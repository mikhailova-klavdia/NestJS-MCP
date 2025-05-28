import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { ProjectEntity } from "../src/modules/project/project.entity";
import { DataSource, Repository } from "typeorm";
import { AppModule } from "src/app.module";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("ProjectController (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let projectRepo: Repository<ProjectEntity>;
  let projectId: number;

  const API = "/projects";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get<DataSource>(DataSource);

    await dataSource.synchronize(true);

    projectRepo = app.get<Repository<ProjectEntity>>(
      getRepositoryToken(ProjectEntity)
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it("GET /api/projects -> empty array", () =>
    request(app.getHttpServer()).get(API).expect(200).expect([]));

  it("POST /api/projects -> create one", () =>
    request(app.getHttpServer())
      .post(API)
      .send({
        name: "Test",
        description: "Desc",
        repoUrl: "https://github.com",
      })
      .expect(201)
      .then((res) => {
        expect(res.body).toMatchObject({
          id: expect.any(Number),
          name: "Test",
          description: "Desc",
          repoUrl: "https://github.com",
        });
        projectId = res.body.id;
      }));

  it("GET /api/projects -> [one project]", () =>
    request(app.getHttpServer())
      .get(API)
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(projectId);
      }));

  it("GET /api/projects/:id -> single project", () =>
    request(app.getHttpServer())
      .get(`${API}/${projectId}`)
      .expect(200)
      .then((res) => {
        expect(res.body.id).toBe(projectId);
        expect(res.body.name).toBe("Test");
      }));

  it("PATCH /api/projects/:id -> update name", () =>
    request(app.getHttpServer())
      .patch(`${API}/${projectId}`)
      .send({ name: "Updated" })
      .expect(200)
      .then((res) => {
        expect(res.body.name).toBe("Updated");
      }));

  it("DELETE /api/projects/:id -> 204", () =>
    request(app.getHttpServer()).delete(`${API}/${projectId}`).expect(204));

  it("GET /api/projects/:id after delete -> 404", () =>
    request(app.getHttpServer()).get(`${API}/${projectId}`).expect(404));
});
