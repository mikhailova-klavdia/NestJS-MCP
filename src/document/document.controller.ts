import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { DocumentService } from './document.service';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  async createDocument(
    @Body('title') title: string,
    @Body('content') content: string,
  ) {
    if (!title || !content) {
      throw new BadRequestException('Title and content are required');
    }
    const document = await this.documentService.saveDocument(title, content);
    return {
      message: 'Document saved successfully',
      document,
    };
  }
}
