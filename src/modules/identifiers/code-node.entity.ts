import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ProjectEntity } from "../git/project.entity";
import {
  ClassDeclaration,
  ConstructorDeclaration,
  DeclarationStatement,
  ExportAssignment,
  ExportDeclaration,
  ExportSpecifier,
  FunctionDeclaration,
  ImportDeclaration,
  MethodDeclaration,
  PropertyDeclaration,
  VariableDeclaration,
  VariableStatement,
} from "typescript";

export type ContextV1 = {
  declarationType:
  | ClassDeclaration
  | FunctionDeclaration
  | VariableDeclaration
  | ImportDeclaration
  | ExportDeclaration
  | MethodDeclaration
  | PropertyDeclaration
  | ConstructorDeclaration
  entryPoints: EntryPoint[];
  importRequirements : string;
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
