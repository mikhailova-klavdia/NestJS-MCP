import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProjectEntity } from '../git/project.entity';

@Entity()
export class IdentifierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  identifier: string;

  @Column()
  context: string;

  @Column('text')
  codeSnippet: string;

  @Column()
  filePath: string;

  @Column('simple-array')
  embedding: number[];

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'projectId' })
  project: ProjectEntity;

  @ManyToOne(() => IdentifierEntity, (identifier) => identifier.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: IdentifierEntity;

  @Column({ nullable: true })
  parentId: string;

  @OneToMany(() => IdentifierEntity, (identifier) => identifier.parent)
  children: IdentifierEntity[];
}
