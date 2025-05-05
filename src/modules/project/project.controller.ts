import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { ProjectService } from './project.service';
  import { ProjectDto } from './project.dto';
  
  @Controller('projects')
  export class ProjectController {
    constructor(private readonly projects: ProjectService) {}
  
    @Post()
    create(@Body() dto: ProjectDto) {
      return this.projects.create(dto);
    }
  
    @Get()
    findAll() {
      return this.projects.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.projects.findOne(id);
    }
  
    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() dto: Partial<ProjectDto>,
    ) {
      return this.projects.update(id, dto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    delete(@Param('id') id: string) {
      return this.projects.delete(id);
    }
  }