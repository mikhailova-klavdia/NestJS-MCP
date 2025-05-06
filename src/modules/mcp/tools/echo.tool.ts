import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';

@Injectable()
export class EchoTool {
  @Tool({
    name: 'echo',
    description: 'Echoes back the given input string',
    parameters: z.object({
      message: z.string(),
    }),
  })
  async run({ message }: { message: string }, context: Context) {
    return message;
  }
}
