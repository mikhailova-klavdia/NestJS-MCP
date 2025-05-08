import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { CodeNodeEntity } from "./code-node.entity";

@Entity()
export class CodeEdgeEntity {
  @PrimaryColumn()
  sourceId: string;

  @PrimaryColumn()
  targetId: string;

  @PrimaryColumn()
  relType: string;

  @ManyToOne(() => CodeNodeEntity)
  @JoinColumn({ name: "sourceId" })
  source: CodeNodeEntity;

  @ManyToOne(() => CodeNodeEntity)
  @JoinColumn({ name: "targetId" })
  target: CodeNodeEntity;
}
