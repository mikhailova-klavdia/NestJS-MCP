import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingService } from '../git/embedding.service';
import { SimilarityService } from 'src/modules/rag/similarity.service';
import { CodeNodeEntity } from './code-node.entity';

@Injectable()
export class IdentifierService {
  constructor(
    @InjectRepository(CodeNodeEntity)
    private readonly _identifierRepository: Repository<CodeNodeEntity>,
    private readonly _embeddingService: EmbeddingService,
    private readonly _similarityService: SimilarityService
  ) {}

  async getAllIdentifiers(): Promise<CodeNodeEntity[]> {
    const identifiers = await this._identifierRepository.find();

    // ensure each identifier has an embedding
    for (const ident of identifiers) {
      if (!ident.embedding) {
        ident.embedding = await this._embeddingService.embed(ident.codeSnippet || ident.identifier);
        await this._identifierRepository.save(ident);
      }
    }

    return identifiers;
  }

  async saveIdentifier(identifier: string, codeSnippet: string): Promise<CodeNodeEntity> {
    const entity = new CodeNodeEntity();
    entity.identifier = identifier;
    entity.codeSnippet = codeSnippet;
    entity.filePath = 'manual';
    entity.embedding = await this._embeddingService.embed(codeSnippet);
    return this._identifierRepository.save(entity);
  }

  findMostRelevantIdentifier(
    identifiers: CodeNodeEntity[],
    queryEmbedding: number[]
  ): CodeNodeEntity | null {
    let maxSimilarity = -1;
    let relevant: CodeNodeEntity | null = null;

    for (const ident of identifiers) {
      if (ident.embedding) {
        const similarity = this._similarityService.cosineSimilarity(
          queryEmbedding,
          ident.embedding
        );
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          relevant = ident;
        }
      }
    }

    return relevant;
  }

  findTop5RelevantIdentifiers(
    identifiers: CodeNodeEntity[],
    queryEmbedding: number[]
  ): { identifier: CodeNodeEntity; similarity: number }[] {
    const relevant: { identifier: CodeNodeEntity; similarity: number }[] = [];

    for (const ident of identifiers) {
      if (!ident.embedding) continue;

      const similarity = this._similarityService.cosineSimilarity(queryEmbedding, ident.embedding);

      if (relevant.length < 5) {
        relevant.push({ identifier: ident, similarity });
        relevant.sort((a, b) => a.similarity - b.similarity);
        continue;
      }

      if (similarity > relevant[0].similarity) {
        relevant[0] = { identifier: ident, similarity };
        relevant.sort((a, b) => a.similarity - b.similarity);
      }
    }

    return relevant.sort((a, b) => b.similarity - a.similarity);
  }
}
