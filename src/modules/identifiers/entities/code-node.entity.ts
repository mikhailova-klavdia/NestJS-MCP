import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import { ProjectEntity } from "../../project/project.entity";
import { ContextV1 } from "src/utils/types/context";

@Entity()
export class CodeNodeEntity {
  @PrimaryColumn("uuid")
  id: string;

  @Column()
  identifier: string;

  @Column()
  declarationType?: string;

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
