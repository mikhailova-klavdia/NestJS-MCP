import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  repoUrl: string;

  @Column({ nullable: true })
  localPath?: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  lastProcessedCommit?: string;
}
