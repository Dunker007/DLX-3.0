class EmbeddingService {
  /**
   * Generates a deterministic pseudo-embedding for bootstrap purposes.
   * @param text The input string.
   * @returns A 32-dimension vector (array of numbers).
   */
  public embedText(text: string): number[] {
    const vector = new Array<number>(32).fill(0);
    if (!text) return vector;

    for (let i = 0; i < text.length; i++) {
      vector[i % 32] = (vector[i % 32] + text.charCodeAt(i) * 0.0001) % 1;
    }
    return vector;
  }

  /**
   * Calculates the cosine similarity between two vectors.
   * @param vecA The first vector.
   * @param vecB The second vector.
   * @returns A similarity score between -1 and 1.
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    const divisor = Math.sqrt(normA) * Math.sqrt(normB);
    if (divisor === 0) {
      return 0;
    }
    
    return dotProduct / divisor;
  }
}

export const embeddingService = new EmbeddingService();
