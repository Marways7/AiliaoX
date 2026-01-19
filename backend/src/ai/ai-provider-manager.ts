/**
 * AI Provider Manager
 * 管理多个AI Provider，提供统一的调用接口
 */

import {
  IAIProvider,
  AIProviderType,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  StreamResponse,
  AIError,
  UsageStats
} from './types';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { KimiProvider } from './providers/kimi.provider';
import { OpenAIProvider } from './providers/openai.provider';
import EventEmitter from 'events';

/**
 * 负载均衡策略
 */
export enum LoadBalanceStrategy {
  ROUND_ROBIN = 'round_robin',
  RANDOM = 'random',
  LEAST_CONNECTIONS = 'least_connections',
  FASTEST_RESPONSE = 'fastest_response',
  WEIGHTED = 'weighted'
}

/**
 * Provider管理器配置
 */
export interface AIProviderManagerConfig {
  defaultProvider?: AIProviderType;
  loadBalanceStrategy?: LoadBalanceStrategy;
  enableFailover?: boolean;
  maxRetries?: number;
  healthCheckInterval?: number;
  providers?: {
    [key in AIProviderType]?: ProviderConfig;
  };
}

/**
 * Provider状态
 */
interface ProviderState {
  provider: IAIProvider;
  type: AIProviderType;
  isActive: boolean;
  isHealthy: boolean;
  activeConnections: number;
  averageResponseTime: number;
  lastHealthCheck?: Date;
  lastError?: Error;
  weight?: number;
}

/**
 * AI Provider Manager实现
 */
export class AIProviderManager extends EventEmitter {
  private providers: Map<AIProviderType, ProviderState> = new Map();
  private activeProvider?: AIProviderType;
  private config: AIProviderManagerConfig;
  private roundRobinIndex = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: AIProviderManagerConfig = {}) {
    super();
    this.config = {
      loadBalanceStrategy: LoadBalanceStrategy.ROUND_ROBIN,
      enableFailover: true,
      maxRetries: 3,
      healthCheckInterval: 60000, // 1分钟
      ...config
    };
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 从环境变量加载配置
    await this.loadProvidersFromEnv();

    // 初始化配置的providers
    if (this.config.providers) {
      for (const [type, config] of Object.entries(this.config.providers)) {
        if (config) {
          await this.registerProvider(type as AIProviderType, config);
        }
      }
    }

    // 设置默认Provider
    if (this.config.defaultProvider) {
      try {
        this.setActiveProvider(this.config.defaultProvider);
      } catch (error) {
        console.warn(`Failed to set default provider ${this.config.defaultProvider}:`, error);
      }
    } else if (this.providers.size > 0) {
      // 使用第一个可用的Provider作为默认
      const firstProvider = Array.from(this.providers.keys())[0];
      try {
        this.setActiveProvider(firstProvider);
      } catch (error) {
        console.warn(`Failed to set first provider ${firstProvider}:`, error);
      }
    }

    // 启动健康检查
    if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
      this.startHealthCheck();
    }

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * 从环境变量加载Provider配置
   */
  private async loadProvidersFromEnv(): Promise<void> {
    const envProviders: Partial<Record<AIProviderType, ProviderConfig>> = {};

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      envProviders[AIProviderType.DEEPSEEK] = {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiBase: process.env.DEEPSEEK_API_BASE
      };
    }

    // Gemini
    if (process.env.GEMINI_API_KEY) {
      envProviders[AIProviderType.GEMINI] = {
        apiKey: process.env.GEMINI_API_KEY,
        apiBase: process.env.GEMINI_API_BASE
      };
    }

    // Kimi
    if (process.env.KIMI_API_KEY) {
      envProviders[AIProviderType.KIMI] = {
        apiKey: process.env.KIMI_API_KEY,
        apiBase: process.env.KIMI_API_BASE
      };
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      envProviders[AIProviderType.OPENAI] = {
        apiKey: process.env.OPENAI_API_KEY,
        apiBase: process.env.OPENAI_API_BASE,
        organization: process.env.OPENAI_ORGANIZATION
      };
    }

    // 注册从环境变量加载的Providers
    for (const [type, config] of Object.entries(envProviders)) {
      if (config) {
        await this.registerProvider(type as AIProviderType, config);
      }
    }

    // 设置默认Provider（从环境变量）
    const defaultProvider = process.env.DEFAULT_AI_PROVIDER as AIProviderType | undefined;
    if (defaultProvider && envProviders[defaultProvider]) {
      this.config.defaultProvider = defaultProvider;
    }
  }

  /**
   * 注册Provider
   */
  async registerProvider(type: AIProviderType, config: ProviderConfig): Promise<void> {
    try {
      let provider: IAIProvider;

      // 创建对应的Provider实例
      switch (type) {
        case AIProviderType.DEEPSEEK:
          provider = new DeepSeekProvider();
          break;
        case AIProviderType.GEMINI:
          provider = new GeminiProvider();
          break;
        case AIProviderType.KIMI:
          provider = new KimiProvider();
          break;
        case AIProviderType.OPENAI:
          provider = new OpenAIProvider();
          break;
        default:
          throw new Error(`Unknown provider type: ${type}`);
      }

      // 初始化Provider
      await provider.initialize(config);

      // 保存Provider状态
      this.providers.set(type, {
        provider,
        type,
        isActive: true,
        isHealthy: true,
        activeConnections: 0,
        averageResponseTime: 0,
        weight: 1
      });

      this.emit('providerRegistered', type);
      console.log(`Provider ${type} registered successfully`);

    } catch (error) {
      console.error(`Failed to register provider ${type}:`, error);
      this.emit('providerRegistrationFailed', type, error);
      // 不抛出错误，允许服务器继续启动，即使某个provider注册失败
      // throw error;
    }
  }

  /**
   * 移除Provider
   */
  removeProvider(type: AIProviderType): void {
    if (this.providers.delete(type)) {
      if (this.activeProvider === type) {
        this.activeProvider = undefined;
      }
      this.emit('providerRemoved', type);
    }
  }

  /**
   * 设置活动Provider
   */
  setActiveProvider(type: AIProviderType): void {
    if (!this.providers.has(type)) {
      throw new AIError(
        `Provider ${type} not registered`,
        'PROVIDER_NOT_FOUND'
      );
    }

    this.activeProvider = type;
    this.emit('activeProviderChanged', type);
  }

  /**
   * 获取活动Provider
   */
  getActiveProvider(): IAIProvider {
    if (!this.activeProvider) {
      throw new AIError(
        'No active provider set',
        'NO_ACTIVE_PROVIDER'
      );
    }

    const state = this.providers.get(this.activeProvider);
    if (!state) {
      throw new AIError(
        'Active provider not found',
        'PROVIDER_NOT_FOUND'
      );
    }

    return state.provider;
  }

  /**
   * 获取下一个Provider（负载均衡）
   */
  private getNextProvider(): IAIProvider {
    const availableProviders = Array.from(this.providers.values())
      .filter(state => state.isActive && state.isHealthy);

    if (availableProviders.length === 0) {
      throw new AIError(
        'No available providers',
        'NO_AVAILABLE_PROVIDERS'
      );
    }

    let selectedState: ProviderState;

    switch (this.config.loadBalanceStrategy) {
      case LoadBalanceStrategy.ROUND_ROBIN:
        selectedState = availableProviders[this.roundRobinIndex % availableProviders.length];
        this.roundRobinIndex++;
        break;

      case LoadBalanceStrategy.RANDOM:
        selectedState = availableProviders[Math.floor(Math.random() * availableProviders.length)];
        break;

      case LoadBalanceStrategy.LEAST_CONNECTIONS:
        selectedState = availableProviders.reduce((min, current) =>
          current.activeConnections < min.activeConnections ? current : min
        );
        break;

      case LoadBalanceStrategy.FASTEST_RESPONSE:
        selectedState = availableProviders.reduce((fastest, current) =>
          current.averageResponseTime < fastest.averageResponseTime ? current : fastest
        );
        break;

      case LoadBalanceStrategy.WEIGHTED:
        selectedState = this.selectWeightedProvider(availableProviders);
        break;

      default:
        selectedState = availableProviders[0];
    }

    return selectedState.provider;
  }

  /**
   * 加权选择Provider
   */
  private selectWeightedProvider(providers: ProviderState[]): ProviderState {
    const totalWeight = providers.reduce((sum, p) => sum + (p.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const provider of providers) {
      random -= (provider.weight || 1);
      if (random <= 0) {
        return provider;
      }
    }

    return providers[0];
  }

  /**
   * 对话接口
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // 获取要使用的Provider
    const provider = this.config.loadBalanceStrategy ?
      this.getNextProvider() : this.getActiveProvider();

    // 记录活动连接
    const state = this.getProviderState(provider);
    if (state) {
      state.activeConnections++;
    }

    try {
      // 如果启用故障转移，尝试多个Provider
      if (this.config.enableFailover) {
        return await this.chatWithFailover(request);
      } else {
        return await provider.chat(request);
      }

    } catch (error) {
      throw error;

    } finally {
      // 更新统计信息
      if (state) {
        state.activeConnections--;
        const responseTime = Date.now() - startTime;
        state.averageResponseTime =
          (state.averageResponseTime * 0.9) + (responseTime * 0.1);
      }
    }
  }

  /**
   * 带故障转移的对话
   */
  private async chatWithFailover(request: ChatRequest): Promise<ChatResponse> {
    const triedProviders = new Set<AIProviderType>();
    let lastError: Error | undefined;

    for (let i = 0; i < this.config.maxRetries!; i++) {
      const availableProviders = Array.from(this.providers.entries())
        .filter(([type, state]) =>
          !triedProviders.has(type) && state.isActive && state.isHealthy
        );

      if (availableProviders.length === 0) {
        break;
      }

      const [type, state] = availableProviders[0];
      triedProviders.add(type);

      try {
        return await state.provider.chat(request);
      } catch (error) {
        lastError = error as Error;
        console.error(`Provider ${type} failed:`, error);

        // 标记Provider为不健康
        state.isHealthy = false;
        state.lastError = lastError;
        this.emit('providerFailed', type, error);
      }
    }

    throw lastError || new AIError(
      'All providers failed',
      'ALL_PROVIDERS_FAILED'
    );
  }

  /**
   * 流式对话接口
   */
  async *streamChat(request: ChatRequest): AsyncIterableIterator<StreamResponse> {
    const provider = this.config.loadBalanceStrategy ?
      this.getNextProvider() : this.getActiveProvider();

    const state = this.getProviderState(provider);
    if (state) {
      state.activeConnections++;
    }

    try {
      yield* provider.streamChat(request);
    } finally {
      if (state) {
        state.activeConnections--;
      }
    }
  }

  /**
   * 获取Provider状态
   */
  private getProviderState(provider: IAIProvider): ProviderState | undefined {
    for (const state of this.providers.values()) {
      if (state.provider === provider) {
        return state;
      }
    }
    return undefined;
  }

  /**
   * 健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const [type, state] of this.providers.entries()) {
        try {
          const health = await state.provider.healthCheck();
          state.isHealthy = health.status === 'healthy';
          state.lastHealthCheck = new Date();

          if (!state.isHealthy) {
            console.warn(`Provider ${type} is unhealthy:`, health.message);
            this.emit('providerUnhealthy', type, health);
          }

        } catch (error) {
          state.isHealthy = false;
          state.lastError = error as Error;
          console.error(`Health check failed for ${type}:`, error);
          this.emit('healthCheckFailed', type, error);
        }
      }
    }, this.config.healthCheckInterval!);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * 获取所有Provider的状态
   */
  getAllProviderStatus(): Map<AIProviderType, {
    isActive: boolean;
    isHealthy: boolean;
    activeConnections: number;
    averageResponseTime: number;
    usage: UsageStats;
  }> {
    const status = new Map();

    for (const [type, state] of this.providers.entries()) {
      status.set(type, {
        isActive: state.isActive,
        isHealthy: state.isHealthy,
        activeConnections: state.activeConnections,
        averageResponseTime: state.averageResponseTime,
        usage: state.provider.getUsage()
      });
    }

    return status;
  }

  /**
   * 获取可用的Provider列表
   */
  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.entries())
      .filter(([_, state]) => state.isActive && state.isHealthy)
      .map(([type, _]) => type);
  }

  /**
   * 获取所有Provider列表
   */
  getProviders(): IAIProvider[] {
    return Array.from(this.providers.values()).map(state => state.provider);
  }

  /**
   * 获取当前活跃的Provider
   */
  getCurrentProvider(): string {
    return this.activeProvider || 'none';
  }

  /**
   * 切换Provider
   */
  switchProvider(name: string): void {
    const providerEntry = Array.from(this.providers.entries())
      .find(([type, state]) =>
        type.toLowerCase() === name.toLowerCase() ||
        state.provider.name.toLowerCase() === name.toLowerCase()
      );

    if (!providerEntry) {
      throw new AIError(
        `Provider ${name} not found`,
        'PROVIDER_NOT_FOUND'
      );
    }

    this.setActiveProvider(providerEntry[0]);
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    this.stopHealthCheck();
    this.providers.clear();
    this.removeAllListeners();
  }
}