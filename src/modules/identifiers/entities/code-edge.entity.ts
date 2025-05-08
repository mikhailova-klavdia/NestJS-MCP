import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CodeNodeEntity } from "./code-node.entity";
import { RelationshipType } from "src/utils/types";

@Entity()
export class CodeEdgeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @PrimaryColumn({
    type: "enum",
    enum: RelationshipType,
  })
  relType: RelationshipType;

  @ManyToOne(() => CodeNodeEntity)
  @JoinColumn({ name: "sourceId" })
  source: CodeNodeEntity;

  @ManyToOne(() => CodeNodeEntity)
  @JoinColumn({ name: "targetId" })
  target: CodeNodeEntity;
}
