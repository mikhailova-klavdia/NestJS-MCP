import { Controller, Post, Body } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  async query(
    @Body() body
    ): Promise<string> {
    if (!body.query) {
      throw new Error('Query parameter is required');
    }

    const answer = this.ragService.retrieveAndGenerate(body.query)

    return answer;
  }
}