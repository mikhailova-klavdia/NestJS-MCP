import { Injectable } from '@nestjs/common';
import { Ollama } from '@langchain/ollama';

@Injectable()
export class LangchainService {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({
      model: 'deepseek-r1:7b',
    });
  }
}
