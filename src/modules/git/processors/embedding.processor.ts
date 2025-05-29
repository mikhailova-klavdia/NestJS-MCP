import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { GitService } from "../git.service";
import { ProjectEntity } from "src/modules/project/project.entity";
import { CodeNodeEntity } from "src/modules/identifiers/entities/code-node.entity";

@Injectable()
@Processor("code-embedding", {
  lockDuration: 1000 * 60 * 5,
})
export class EmbeddingProcessor extends WorkerHost {
  private readonly _logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly _gitService: GitService) {
    super();
  }

  async process(job: Job<{ batch: CodeNodeEntity[]; project: ProjectEntity }>) {
    try {
      this._logger.log(
        `🔄 Processing batch of ${job.data.batch.length} identifiers`
      );
      await this._gitService.processBatchOfCodeNodes(
        job.data.batch,
        job.data.project
      );
    } catch (err) {
      this._logger.error(err);
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(jobId: string) {
    this._logger.log(`🎉 Job ${jobId} completed!`);
  }
}
