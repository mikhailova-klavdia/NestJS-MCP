import { Module } from "@nestjs/common";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { ColumnType, DataSource, DataSourceOptions } from "typeorm";
import { CodeNodeEntity } from "./modules/identifiers/entities/code-node.entity";
import { CodeEdgeEntity } from "./modules/identifiers/entities/code-edge.entity";
import { ProjectEntity } from "./modules/project/project.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: async (): Promise<TypeOrmModuleOptions> => ({
        type: "postgres",
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        autoLoadEntities: false,
        entities: [CodeNodeEntity, CodeEdgeEntity, ProjectEntity],
        synchronize: false,
        dropSchema: true,
      }),
      dataSourceFactory: async (options) => {
        const ds = new DataSource(options as DataSourceOptions);

        ds.driver.supportedDataTypes.push("vector" as ColumnType);
        ds.driver.withLengthColumnTypes.push("vector" as ColumnType);

        await ds.initialize();
        await ds.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        await ds.synchronize();

        return ds;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DataModule {}
