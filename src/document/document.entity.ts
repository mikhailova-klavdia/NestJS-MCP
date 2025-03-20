import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column('float', { array: true, nullable: true })
  embedding?: number[];

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
