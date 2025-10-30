import { securityService } from './securityService';
import { performanceMonitoringService } from './performanceMonitoringService';
import { telemetryService } from './telemetryService';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'local';

export interface ModelConfig {
  id: string;
  provider: AIProvider;
  modelName: string;
  displayName: string;
  maxTokens: number;
  costPer1kTokensInput: number;
  costPer1kTokensOutput: number;
  supportsVision: boolean;
  supportsAudio: boolean;
  contextWindow: number;
}

export interface ComparisonResult {
  model: string;
  response: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  quality?: number; // 1-10 rating
}

export interface ModelUsageStats {
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  avgLatencyMs: number;
  successRate: number;
  lastUsed: string;
}

const STORAGE_KEY_STATS = 'dlx-model-usage-stats';
const STORAGE_KEY_CACHE = 'dlx-prompt-cache';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Predefined model configurations
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gemini-flash': {
    id: 'gemini-flash',
    provider: 'gemini',
    modelName: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    maxTokens: 8192,
    costPer1kTokensInput: 0.075,
    costPer1kTokensOutput: 0.30,
    supportsVision: true,
    supportsAudio: true,
    contextWindow: 1000000,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    provider: 'gemini',
    modelName: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    maxTokens: 8192,
    costPer1kTokensInput: 1.25,
    costPer1kTokensOutput: 5.00,
    supportsVision: true,
    supportsAudio: true,
    contextWindow: 2000000,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    provider: 'openai',
    modelName: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    maxTokens: 4096,
    costPer1kTokensInput: 10.00,
    costPer1kTokensOutput: 30.00,
    supportsVision: true,
    supportsAudio: false,
    contextWindow: 128000,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    provider: 'anthropic',
    modelName: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    maxTokens: 8192,
    costPer1kTokensInput: 3.00,
    costPer1kTokensOutput: 15.00,
    supportsVision: true,
    supportsAudio: false,
    contextWindow: 200000,
  },
  'local-llama': {
    id: 'local-llama',
    provider: 'local',
    modelName: 'llama-3.1-8b',
    displayName: 'Llama 3.1 8B (Local)',
    maxTokens: 4096,
    costPer1kTokensInput: 0,
    costPer1kTokensOutput: 0,
    supportsVision: false,
    supportsAudio: false,
    contextWindow: 128000,
  },
};

class MultiModelService {
  private usageStats: Map<string, ModelUsageStats> = new Map();
  private promptCache: Map<string, { response: string; timestamp: number; model: string }> = new Map();

  constructor() {
    this.loadUsageStats();
    this.loadPromptCache();
  }

  // Get available models
  public getAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS);
  }

  public getModelConfig(modelId: string): ModelConfig | undefined {
    return MODEL_CONFIGS[modelId];
  }

  // Generate response with a specific model
  public async generateResponse(
    modelId: string,
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      useCache?: boolean;
    }
  ): Promise<{ response: string; tokensIn: number; tokensOut: number; latencyMs: number; fromCache: boolean }> {
    const model = this.getModelConfig(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Check cache
    if (options?.useCache !== false) {
      const cached = this.getCachedResponse(prompt, modelId);
      if (cached) {
        securityService.logAudit('ai_request', modelId, { cached: true, prompt: prompt.substring(0, 50) });
        return {
          response: cached,
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: 0,
          fromCache: true,
        };
      }
    }

    // Check rate limiting
    if (!securityService.checkRateLimit(`ai-${modelId}`, 100)) {
      throw new Error('Rate limit exceeded for this model');
    }

    // Track performance
    const stopTimer = performanceMonitoringService.startTimer(`ai-request-${modelId}`);

    try {
      const startTime = performance.now();
      
      // Simulate AI call (in real implementation, this would call the actual API)
      const { response, tokensIn, tokensOut } = await this.callModelAPI(model, prompt, options);
      
      const latencyMs = performance.now() - startTime;
      stopTimer();

      // Update usage stats
      this.updateUsageStats(modelId, tokensIn, tokensOut, latencyMs, true);

      // Cache response
      if (options?.useCache !== false) {
        this.cacheResponse(prompt, modelId, response);
      }

      // Log audit
      securityService.logAudit('ai_request', modelId, {
        tokensIn,
        tokensOut,
        latencyMs,
        prompt: prompt.substring(0, 50),
      });

      // Log telemetry
      telemetryService.logEvent({
        type: 'assistant_call',
        action: 'generate',
        model: modelId,
        tokensIn,
        tokensOut,
        latencyMs,
        cacheHit: false,
      });

      return { response, tokensIn, tokensOut, latencyMs, fromCache: false };
    } catch (error) {
      stopTimer();
      this.updateUsageStats(modelId, 0, 0, 0, false);
      throw error;
    }
  }

  // Compare responses from multiple models
  public async compareModels(
    modelIds: string[],
    prompt: string
  ): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];

    // Run models in parallel
    const promises = modelIds.map(async (modelId) => {
      try {
        const result = await this.generateResponse(modelId, prompt, { useCache: false });
        const config = this.getModelConfig(modelId);
        const cost = config
          ? (result.tokensIn * config.costPer1kTokensInput + 
             result.tokensOut * config.costPer1kTokensOutput) / 1000
          : 0;

        return {
          model: modelId,
          response: result.response,
          latencyMs: result.latencyMs,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          cost,
        };
      } catch (error) {
        return {
          model: modelId,
          response: `Error: ${error}`,
          latencyMs: 0,
          tokensIn: 0,
          tokensOut: 0,
          cost: 0,
        };
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    return results;
  }

  // Get usage statistics
  public getUsageStats(modelId?: string): Map<string, ModelUsageStats> | ModelUsageStats | undefined {
    if (modelId) {
      return this.usageStats.get(modelId);
    }
    return this.usageStats;
  }

  // Optimize prompt using AI
  public async optimizePrompt(originalPrompt: string, targetModel: string): Promise<string> {
    // In a real implementation, this would use an AI model to optimize the prompt
    // For now, we'll return a template-based optimization
    const modelConfig = this.getModelConfig(targetModel);
    
    let optimized = originalPrompt;
    
    // Add context window awareness
    if (modelConfig && originalPrompt.length > modelConfig.contextWindow * 0.8) {
      optimized = originalPrompt.substring(0, modelConfig.contextWindow * 0.8);
    }

    // Add model-specific instructions
    if (modelConfig?.provider === 'anthropic') {
      optimized = `Human: ${optimized}\n\nAssistant:`;
    }

    return optimized;
  }

  // Cost estimation
  public estimateCost(modelId: string, estimatedTokensIn: number, estimatedTokensOut: number): number {
    const config = this.getModelConfig(modelId);
    if (!config) return 0;

    return (
      (estimatedTokensIn * config.costPer1kTokensInput +
        estimatedTokensOut * config.costPer1kTokensOutput) / 1000
    );
  }

  public getTotalCost(): number {
    let total = 0;
    this.usageStats.forEach(stats => {
      total += stats.totalCost;
    });
    return total;
  }

  // Private methods
  private async callModelAPI(
    model: ModelConfig,
    prompt: string,
    options?: any
  ): Promise<{ response: string; tokensIn: number; tokensOut: number }> {
    // This is a placeholder for actual API calls
    // In production, this would integrate with real APIs
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    const tokensIn = Math.ceil(prompt.length / 4);
    const tokensOut = Math.ceil(tokensIn * (0.5 + Math.random()));

    return {
      response: `[${model.displayName}] Response to: ${prompt.substring(0, 50)}...`,
      tokensIn,
      tokensOut,
    };
  }

  private updateUsageStats(
    modelId: string,
    tokensIn: number,
    tokensOut: number,
    latencyMs: number,
    success: boolean
  ) {
    const existing = this.usageStats.get(modelId) || {
      totalCalls: 0,
      totalTokensIn: 0,
      totalTokensOut: 0,
      totalCost: 0,
      avgLatencyMs: 0,
      successRate: 0,
      lastUsed: new Date().toISOString(),
    };

    const config = this.getModelConfig(modelId);
    const cost = config
      ? (tokensIn * config.costPer1kTokensInput + tokensOut * config.costPer1kTokensOutput) / 1000
      : 0;

    const newStats: ModelUsageStats = {
      totalCalls: existing.totalCalls + 1,
      totalTokensIn: existing.totalTokensIn + tokensIn,
      totalTokensOut: existing.totalTokensOut + tokensOut,
      totalCost: existing.totalCost + cost,
      avgLatencyMs: (existing.avgLatencyMs * existing.totalCalls + latencyMs) / (existing.totalCalls + 1),
      successRate: ((existing.successRate * existing.totalCalls) + (success ? 1 : 0)) / (existing.totalCalls + 1),
      lastUsed: new Date().toISOString(),
    };

    this.usageStats.set(modelId, newStats);
    this.saveUsageStats();
  }

  private getCachedResponse(prompt: string, modelId: string): string | null {
    const cacheKey = this.getCacheKey(prompt, modelId);
    const cached = this.promptCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.response;
    }

    // Remove expired cache
    if (cached) {
      this.promptCache.delete(cacheKey);
    }

    return null;
  }

  private cacheResponse(prompt: string, modelId: string, response: string) {
    const cacheKey = this.getCacheKey(prompt, modelId);
    this.promptCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      model: modelId,
    });

    // Limit cache size
    if (this.promptCache.size > 100) {
      const firstKey = this.promptCache.keys().next().value;
      this.promptCache.delete(firstKey);
    }

    this.savePromptCache();
  }

  private getCacheKey(prompt: string, modelId: string): string {
    // Simple hash function for cache key
    return `${modelId}:${prompt.substring(0, 100)}`;
  }

  private loadUsageStats() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATS);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.usageStats = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Failed to load usage stats', e);
    }
  }

  private saveUsageStats() {
    try {
      const obj = Object.fromEntries(this.usageStats);
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save usage stats', e);
    }
  }

  private loadPromptCache() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CACHE);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.promptCache = new Map(Object.entries(parsed));
        
        // Clean expired entries
        const now = Date.now();
        for (const [key, value] of this.promptCache.entries()) {
          if (now - value.timestamp > CACHE_TTL_MS) {
            this.promptCache.delete(key);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load prompt cache', e);
    }
  }

  private savePromptCache() {
    try {
      const obj = Object.fromEntries(this.promptCache);
      localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save prompt cache', e);
    }
  }
}

export const multiModelService = new MultiModelService();
