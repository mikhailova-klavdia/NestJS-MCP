import { Injectable } from '@nestjs/common';

@Injectable()
export class SimilarityService {
  constructor() {}

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    this.validateVectors(vecA, vecB);
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }

  euclideanDistance(vecA: number[], vecB: number[]): number {
    this.validateVectors(vecA, vecB);
    return Math.sqrt(vecA.reduce((sum, a, idx) => sum + Math.pow(a - vecB[idx], 2), 0));
  }

  manhattanDistance(vecA: number[], vecB: number[]): number {
    this.validateVectors(vecA, vecB);
    return vecA.reduce((sum, a, idx) => sum + Math.abs(a - vecB[idx]), 0);
  }

  jaccardSimilarity(vecA: number[], vecB: number[]): number {
    this.validateVectors(vecA, vecB);
    const intersection = vecA.reduce((sum, a, idx) => sum + (a && vecB[idx] ? 1 : 0), 0);
    const union = vecA.reduce((sum, a, idx) => sum + (a || vecB[idx] ? 1 : 0), 0);
    return union ? intersection / union : 0;
  }

  pearsonCorrelation(vecA: number[], vecB: number[]): number {
    this.validateVectors(vecA, vecB);
    const n = vecA.length;
    const sumA = vecA.reduce((a, b) => a + b, 0);
    const sumB = vecB.reduce((a, b) => a + b, 0);
    const sumA2 = vecA.reduce((a, b) => a + b * b, 0);
    const sumB2 = vecB.reduce((a, b) => a + b * b, 0);
    const sumAB = vecA.reduce((a, b, idx) => a + b * vecB[idx], 0);

    const numerator = sumAB - (sumA * sumB) / n;
    const denominator = Math.sqrt((sumA2 - (sumA * sumA) / n) * (sumB2 - (sumB * sumB) / n));

    return denominator ? numerator / denominator : 0;
  }

  private validateVectors(vecA: number[], vecB: number[]): void {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
      throw new Error('Vectors must be non-empty');
    }
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must be of equal length');
    }
  }

  getAvailableMethods(): string[] {
    return ['cosine', 'euclidean', 'manhattan', 'jaccard', 'pearson'];
  }
}
