import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ProjectEntity } from "../git/project.entity";
import {
  DeclarationStatement,
  ExportDeclaration,
  ImportDeclaration,
} from "typescript";

export type ContextV1 = {
  declarationType: ExportDeclaration | ImportDeclaration | DeclarationStatement;
  entryPoints: EntryPoint[];
  importRequirements;
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

  @Column("text")
  codeSnippet: string;

  @Column()
  filePath: string;

  @Column("simple-array")
  embedding: number[];

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: "projectId" })
  project: ProjectEntity;
}
