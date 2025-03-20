import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { AIMessageChunk } from '@langchain/core/messages';

@Injectable()
export class ChatService {
  private _chatOllama: ChatOllama;

  constructor() {
    this._chatOllama = new ChatOllama({
      model: process.env.MODEL_NAME,
      baseUrl: process.env.OLLAMA_HOST,
    });
  }

  async askOllama(prompt: string): Promise<AIMessageChunk> {
    try {
      const response = await this._chatOllama.invoke(prompt);
      return response;
    } catch (error) {
      console.error('Error asking Ollama:', error);
      throw new Error('Failed to get response from Ollama');
    }
  }
}
