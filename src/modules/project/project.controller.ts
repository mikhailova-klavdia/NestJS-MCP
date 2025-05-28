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
  import { ProjectDto } from './dto/project.dto';
  
  @Controller('projects')
  export class ProjectController {
    constructor(private readonly _projects: ProjectService) {}
  
    @Post()
    create(@Body() dto: ProjectDto) {
      return this._projects.create(dto);
    }
  
    @Get()
    findAll() {
      return this._projects.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id') id: number) {
      return this._projects.findOne(id);
    }
  
    @Patch(':id')
    update(
      @Param('id') id: number,
      @Body() dto: Partial<ProjectDto>,
    ) {
      return this._projects.update(id, dto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    delete(@Param('id') id: number) {
      return this._projects.delete(id);
    }
  }