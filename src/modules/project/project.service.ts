import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProjectEntity } from "./project.entity";
import { ProjectDto } from "./project.dto";

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: Repository<ProjectEntity>
  ) {}

  async create(projectDto: ProjectDto): Promise<ProjectEntity> {
    const project = this.repo.create(projectDto);
    return this.repo.save(project);
  }

  async findAll(): Promise<ProjectEntity[]> {
    return this.repo.find();
  }

  async findOne(ProjectId: string): Promise<ProjectEntity> {
    const project = await this.repo.findOne({ where: { id: ProjectId } });
    if (!project) throw new NotFoundException(`Project ${ProjectId} not found`);
    return project;
  }

  async update(id: string, dto: Partial<ProjectDto>): Promise<ProjectEntity> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    return this.repo.save(project);
  }

  async delete(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.repo.remove(project);
  }
}
