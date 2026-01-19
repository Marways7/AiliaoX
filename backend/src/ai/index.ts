/**
 * AI模块导出文件
 */

// 类型导出
export * from './types';

// Provider导出
export { BaseAIProvider } from './base-provider';
export { DeepSeekProvider } from './providers/deepseek.provider';
export { GeminiProvider } from './providers/gemini.provider';
export { KimiProvider } from './providers/kimi.provider';
export { OpenAIProvider } from './providers/openai.provider';

// Manager导出
export { AIProviderManager, LoadBalanceStrategy, AIProviderManagerConfig } from './ai-provider-manager';

// 单例实例
import { AIProviderManager } from './ai-provider-manager';
import { AIProviderType } from './types';

/**
 * 创建默认的AI Provider Manager实例
 */
export function createDefaultAIProviderManager(): AIProviderManager {
  const manager = new AIProviderManager({
    defaultProvider: (process.env.DEFAULT_AI_PROVIDER as AIProviderType) || AIProviderType.DEEPSEEK,
    enableFailover: true,
    healthCheckInterval: 60000,
    loadBalanceStrategy: undefined // 不使用负载均衡，使用单一Provider
  });

  return manager;
}

// 导出默认实例
export const defaultAIProviderManager = createDefaultAIProviderManager();

// 导出初始化Promise（应用启动时调用）
export const initializeDefaultAIProvider = async (): Promise<void> => {
  await defaultAIProviderManager.initialize();
};