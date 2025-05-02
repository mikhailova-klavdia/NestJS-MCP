import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';

@Injectable()
export class EchoTool {
  @Tool({
    name: 'echo',
    description: 'Echoes back the provided text.',
    parameters: z.object({ text: z.string() }),
  })
  async run(
    params: { text: string },
    context: Context,
  ) {
    return {
      content: [
        { type: 'text', text: `You said: ${params.text}` },
      ],
    };
  }
}