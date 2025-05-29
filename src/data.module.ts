import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: async (): Promise<TypeOrmModuleOptions> => {
        // your existing DB options:
        const options: TypeOrmModuleOptions = {
          type: 'postgres',
          host: process.env.POSTGRES_HOST,
          port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
          username: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DB,
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        };

        // one-off DataSource to enable pgvector before Nest connects
        const ds = new DataSource(options as DataSourceOptions);
        await ds.initialize();
        await ds.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        await ds.destroy();

        return options;
      },
      // no injections needed since you’re using process.env directly
    }),


  ],
  exports: [TypeOrmModule],
})
export class DataModule {}
