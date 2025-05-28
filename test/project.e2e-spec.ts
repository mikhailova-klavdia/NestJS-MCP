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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = app.get<DataSource>(DataSource);

    await dataSource.dropDatabase();
    await dataSource.runMigrations();

    projectRepo = app.get<Repository<ProjectEntity>>(
      getRepositoryToken(ProjectEntity)
    );
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it("GET /projects -> empty array", () =>
    request(app.getHttpServer()).get("/projects").expect(200).expect([]));

  it("POST /projects -> create one", () =>
    request(app.getHttpServer())
      .post("/projects")
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

  it("GET /projects -> [one project]", () =>
    request(app.getHttpServer())
      .get("/projects")
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(projectId);
      }));

  it("GET /projects/:id -> single project", () =>
    request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(200)
      .then((res) => {
        expect(res.body.id).toBe(projectId);
        expect(res.body.name).toBe("Test");
      }));

  it("PATCH /projects/:id -> update name", () =>
    request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .send({ name: "Updated" })
      .expect(200)
      .then((res) => {
        expect(res.body.name).toBe("Updated");
      }));

  it("DELETE /projects/:id -> 204", () =>
    request(app.getHttpServer()).delete(`/projects/${projectId}`).expect(204));

  it("GET /projects/:id after delete -> 404", () =>
    request(app.getHttpServer()).get(`/projects/${projectId}`).expect(404));
});
