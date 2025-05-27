import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, ParseIntPipe } from "@nestjs/common";
import * as request from "supertest";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProjectModule } from "../src/modules/project/project.module";
import { ProjectEntity } from "../src/modules/project/project.entity";
import { DataSource } from "typeorm";

jest.setTimeout(30000);

describe("ProjectController (e2e)", () => {
  let app: INestApplication;
  let projectId: number;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "postgres",
          host: process.env.POSTGRES_HOST || "localhost",
          port: +(process.env.POSTGRES_PORT || 5433),
          username: process.env.POSTGRES_USER || "root",
          password: process.env.POSTGRES_PASSWORD || "root",
          database: process.env.POSTGRES_DB || "test",
          entities: [ProjectEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([ProjectEntity]),
        ProjectModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.dropDatabase();
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
