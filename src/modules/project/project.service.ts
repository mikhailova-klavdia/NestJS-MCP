import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProjectEntity } from "./project.entity";
import { ProjectDto } from "./dto/project.dto";

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly _projectRepo: Repository<ProjectEntity>
  ) {}

  async create(projectDto: ProjectDto): Promise<ProjectEntity> {
    const project = this._projectRepo.create(projectDto);
    return this._projectRepo.save(project);
  }

  async findAll(): Promise<ProjectEntity[]> {
    return this._projectRepo.find();
  }

  async findOne(ProjectId: number): Promise<ProjectEntity> {
    const project = await this._projectRepo.findOne({ where: { id: ProjectId } });
    if (!project) throw new NotFoundException(`Project ${ProjectId} not found`);
    return project;
  }

  async update(id: number, dto: Partial<ProjectDto>): Promise<ProjectEntity> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    return this._projectRepo.save(project);
  }

  async delete(id: number): Promise<void> {
    const project = await this.findOne(id);
    await this._projectRepo.remove(project);
  }
}
