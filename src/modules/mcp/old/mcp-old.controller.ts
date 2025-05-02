import { Controller, Post, Req, Res, Body, Logger, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpOldController {
  private readonly _logger = new Logger(McpOldController.name);

  constructor(private readonly _mcp: McpService) {}

  @Post()
  @HttpCode(200)
  async handlePost(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
  ) {

    await this._mcp.transport.handleRequest(req, res, body);
  }
}
