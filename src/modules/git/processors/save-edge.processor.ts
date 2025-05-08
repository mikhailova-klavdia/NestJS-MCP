import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { GitService } from "../git.service";
import { CodeEdgeEntity } from "src/modules/identifiers/entities/code-edge.entity";

@Injectable()
@Processor("edge-save", { lockDuration: 1000 * 60 * 5 })
export class EdgeSaveProcessor extends WorkerHost {
  private readonly _logger = new Logger(EdgeSaveProcessor.name);

  constructor(private readonly _gitService: GitService) {
    super();
  }

  async process(job: Job<{ batch: CodeEdgeEntity[] }>) {
    this._logger.log(`💾 Saving batch of ${job.data.batch.length} edges…`);
    await this._gitService.saveBatchOfEdges(job.data.batch);
  }

  @OnWorkerEvent("completed")
  onCompleted(jobId: string) {
    this._logger.log(`🎉 Edge-save job ${jobId} completed`);
  }
}
