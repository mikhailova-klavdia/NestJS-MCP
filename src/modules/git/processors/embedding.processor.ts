import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { GitService } from "../git.service";
import { ProjectEntity } from "src/modules/project/project.entity";
import { ExtractedIdentifier } from "src/utils/types";

@Injectable()
@Processor("code-embedding", {
  lockDuration: 1000 * 60 * 5,
})
export class EmbeddingProcessor extends WorkerHost {
  private readonly _logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly _gitService: GitService) {
    super();
  }

  async process(job: Job<{ batch: ExtractedIdentifier[]; project: ProjectEntity }>) {
    this._logger.log(`🔄 Processing batch of ${job.data.batch.length} identifiers`);
    await this._gitService.processBatch(job.data.batch, job.data.project);
  }

  @OnWorkerEvent("completed")
  onCompleted(jobId: string) {
    this._logger.log(`🎉 Job ${jobId} completed!`);
  }
}
