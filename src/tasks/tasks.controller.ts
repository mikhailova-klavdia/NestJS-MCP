import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';

import { Task } from '../task.entity';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  async createTask(
    @Body() createTaskDto: { title: string; description: string },
  ): Promise<Task> {
    return await this.tasksService.createTask(
      createTaskDto.title,
      createTaskDto.description,
    );
  }

  @Get()
  async getAllTasks(): Promise<Task[]> {
    return await this.tasksService.getAllTasks();
  }

  @Get(':id')
  async getTaskById(@Param('id') id: number): Promise<Task> {
    return await this.tasksService.getTaskById(Number(id));
  }

  @Put(':id/status')
  async updateTaskStatus(
    @Param('id') id: number,
    @Body('status') status: 'OPEN' | 'DONE',
  ): Promise<Task> {
    return await this.tasksService.updateTaskStatus(Number(id), status);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: number): Promise<void> {
    return await this.tasksService.deleteTask(Number(id));
  }
}
