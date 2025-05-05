import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ProjectEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  repoUrl: string;

  @Column({ type: "int", nullable: true })
  webhookId: number | null;

  @Column({ nullable: true })
  webhookSecret?: string;

  @Column({ nullable: true })
  localPath?: string;
}
