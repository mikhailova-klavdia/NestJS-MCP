import { Module } from "@nestjs/common";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { DataSource, DataSourceOptions, ColumnType } from "typeorm";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: async (): Promise<TypeOrmModuleOptions> => {
        const options: DataSourceOptions = {
          type: "postgres",
          host: process.env.POSTGRES_HOST,
          port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
          username: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DB,
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          synchronize: false,
          dropSchema: true,
        };

        const ds = new DataSource(options);

        ds.driver.supportedDataTypes.push("vector" as ColumnType);
        ds.driver.withLengthColumnTypes.push("vector" as ColumnType);

        await ds.initialize();
        await ds.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        await ds.synchronize();
        return ds.options as TypeOrmModuleOptions;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DataModule {}
