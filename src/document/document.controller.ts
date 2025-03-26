import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { DocumentService } from './document.service';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  async createDocument(
    @Body() body,
  ) {
    let title = body.title;
    let content = body.content;
    if (!title || !content) {
      console.log(title, content)
      throw new BadRequestException('Title and content are required');
    }
    const document = await this.documentService.saveDocument(title, content);
    return {
      message: 'Document saved successfully',
      document,
    };
  }
}
