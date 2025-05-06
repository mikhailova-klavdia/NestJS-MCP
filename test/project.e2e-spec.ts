import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { ProjectModule } from "../src/modules/project/project.module";
import { AppModule } from "../src/app.module";

describe("ProjectController (e2e)", () => {
  let app: INestApplication;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ProjectModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /projects -> empty", () =>
    request(app.getHttpServer()).get("/projects").expect(200).expect([]));

  it("POST /projects -> create one project", () =>
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
          id: expect.any(String),
          name: "Test",
          description: "Desc",
          repoUrl: "https://github.com",
        });
        projectId = res.body.id;
      }));

  it("GET /projects -> gets one project", () =>
    request(app.getHttpServer())
      .get("/projects")
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(projectId);
      }));

  it("GET /projects/:id -> the project by id", () =>
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
        expect(res.body.id).toBe(projectId);
        expect(res.body.name).toBe("Updated");
      }));

  it("DELETE /projects/:id -> 204 no content", () =>
    request(app.getHttpServer()).delete(`/projects/${projectId}`).expect(204));

  it("GET /projects/:id after delete -> 404", () =>
    request(app.getHttpServer()).get(`/projects/${projectId}`).expect(404));
});
