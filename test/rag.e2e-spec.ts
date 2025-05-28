import * as request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RagModule } from "src/modules/rag/rag.module";
import { RagService } from "src/modules/rag/rag.service";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";

describe("RagController (e2e)", () => {
  let app: INestApplication;
  const mockResult = { time: 123, results: [] };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RagModule],
    })
      .overrideProvider(getRepositoryToken(CodeNodeEntity))
      .useValue({})
      .overrideProvider(getRepositoryToken(CodeEdgeEntity))
      .useValue({})
      .overrideProvider(RagService)
      .useValue({ retrieve: jest.fn().mockResolvedValue(mockResult) })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true })
    );
    await app.init();
  });

  it("/POST rag/query - missing parameters should return 400", () => {});

  it("/POST rag/query - valid request returns results", () => {});

  afterAll(async () => {
    await app.close();
  });
});
