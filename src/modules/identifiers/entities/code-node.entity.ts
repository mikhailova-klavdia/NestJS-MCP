import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Index,
  ColumnType,
} from "typeorm";
import { ProjectEntity } from "../../project/project.entity";
import { ContextV1 } from "src/utils/types/context";

@Entity()
export class CodeNodeEntity {
  @PrimaryColumn("uuid")
  id: string;

  //@Index()
  @Column()
  identifier: string;

  @Column()
  declarationType?: string;

  @Column({ type: "jsonb" })
  context: ContextV1;

  @Column()
  filePath: string;

  @Column({
    type: "vector" as ColumnType,
    nullable: true,
  })
  embedding?: number[];

  //@Index()
  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: "projectId" })
  project?: ProjectEntity;
}
