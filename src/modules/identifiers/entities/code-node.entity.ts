import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import { ProjectEntity } from "../../project/project.entity";

export type ContextV1 = {
  declarationType?: string;
  entryPoints?: EntryPoint[] | null;
  dependancies?: string | null;
  codeSnippet: string;
};

export type EntryPoint = {
  codeSnippet: string;
  filepath: string;
};

@Entity()
export class CodeNodeEntity {
  @PrimaryColumn("uuid")
  id: string;

  @Column()
  identifier: string;

  @Column({ type: "jsonb" })
  context: ContextV1;

  @Column()
  filePath: string;

  @Column("simple-array", { nullable: true })
  embedding?: number[];

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: "projectId" })
  project?: ProjectEntity;
}
