import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";
import { CodeNodeEntity } from "./code-node.entity";
import { RelationshipType } from "src/utils/types/context";

@Entity()
export class CodeEdgeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: RelationshipType,
  })
  relType: RelationshipType;

  @ManyToOne(() => CodeNodeEntity, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "sourceId" })
  source: CodeNodeEntity;

  @ManyToOne(() => CodeNodeEntity, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "targetId" })
  target: CodeNodeEntity;
}
