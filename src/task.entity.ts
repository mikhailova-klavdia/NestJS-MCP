import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ default: 'OPEN' })
  status: 'OPEN' | 'DONE';
}
