import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { GitService } from "../git.service";

@Injectable()
@Processor("code-indexing", {
  lockDuration: 1000 * 60 * 5, // 5 minutes
})
export class GitProcessor extends WorkerHost {
  private readonly _logger = new Logger(GitProcessor.name);

  constructor(private readonly _gitService: GitService) {
    super();
  }

  async process(job: Job<{ projectId: number }>) {
    try {
      const { projectId } = job.data;
      this._logger.log(`🔄 Starting indexing for project ${projectId}`);

      const project = await this._gitService.findProjectById(projectId);
      await this._gitService.processRepository(project);

      this._logger.log(`✅ Finished indexing for project ${projectId}`);
    } catch (err) {
      this._logger.error(err);
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(jobId: string) {
    this._logger.log(`🎉 Job ${jobId} completed!`);
  }
}
