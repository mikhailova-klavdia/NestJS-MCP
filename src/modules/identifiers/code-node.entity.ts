import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ProjectEntity } from "../git/project.entity";
import { Declaration } from "typescript";

export type ContextV1 = {
  declarationType: Declaration | string | null;
  entryPoints?: EntryPoint[] | null;
  importRequirements?: string | null;
  codeSnippet: string;
};

export type EntryPoint = {
  codeSnippet: string;
  filepath: string;
};

@Entity()
export class CodeNodeEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  identifier: string;

  @Column({ type: "jsonb" })
  context: ContextV1;

  @Column()
  filePath: string;

  @Column("simple-array")
  embedding: number[];

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: "projectId" })
  project: ProjectEntity;
}
