/**
 * AI Provider 基类
 * 提供所有AI Provider的通用实现
 */

import {
  IAIProvider,
  ProviderConfig,
  AICapabilities,
  ChatRequest,
  ChatResponse,
  StreamResponse,
  UsageStats,
  HealthStatus,
  AIError,
  AIProviderType,
  ImageAnalysis
} from './types';
import * as crypto from 'crypto';

/**
 * AI Provider抽象基类
 */
export abstract class BaseAIProvider implements IAIProvider {
  // 基本信息
  abstract name: string;
  abstract version: string;
  abstract capabilities: AICapabilities;

  // 配置信息
  protected config!: ProviderConfig;
  protected apiKey!: string;
  protected apiBase?: string;
  protected isInitialized = false;

  // 统计信息
  protected stats: UsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    successRate: 100,
    averageLatency: 0,
    lastRequestTime: undefined
  };

  // 请求历史（用于计算平均延迟）
  private latencyHistory: number[] = [];
  private maxHistorySize = 100;

  /**
   * 初始化Provider
   */
  async initialize(config: ProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new AIError(
        'API key is required',
        'MISSING_API_KEY',
        this.name as AIProviderType
      );
    }

    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config
    };

    this.apiKey = config.apiKey;
    this.apiBase = config.apiBase;

    // 验证API Key
    const isValid = await this.validateApiKey();
    if (!isValid) {
      throw new AIError(
        'Invalid API key',
        'INVALID_API_KEY',
        this.name as AIProviderType
      );
    }

    this.isInitialized = true;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };

    if (config.apiKey) {
      this.apiKey = config.apiKey;
    }
    if (config.apiBase !== undefined) {
      this.apiBase = config.apiBase;
    }
  }

  /**
   * 确保已初始化
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new AIError(
        'Provider not initialized',
        'NOT_INITIALIZED',
        this.name as AIProviderType
      );
    }
  }

  /**
   * 对话接口（子类必须实现）
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * 流式对话接口（子类必须实现）
   */
  abstract streamChat(request: ChatRequest): AsyncIterableIterator<StreamResponse>;

  /**
   * 验证API Key（子类必须实现）
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * 文本嵌入（可选，子类可重写）
   */
  async embedText?(_text: string): Promise<number[]> {
    throw new AIError(
      'Text embedding not supported',
      'NOT_SUPPORTED',
      this.name as AIProviderType
    );
  }

  /**
   * 图像分析（可选，子类可重写）
   */
  async analyzeImage?(_image: Buffer, _mimeType?: string): Promise<ImageAnalysis> {
    throw new AIError(
      'Image analysis not supported',
      'NOT_SUPPORTED',
      this.name as AIProviderType
    );
  }

  /**
   * 语音合成（可选，子类可重写）
   */
  async synthesizeSpeech?(_text: string, _voice?: string): Promise<Buffer> {
    throw new AIError(
      'Speech synthesis not supported',
      'NOT_SUPPORTED',
      this.name as AIProviderType
    );
  }

  /**
   * 获取使用统计
   */
  getUsage(): UsageStats {
    return { ...this.stats };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const isValid = await this.validateApiKey();
      const latency = Date.now() - startTime;

      return {
        status: isValid ? 'healthy' : 'unhealthy',
        latency,
        message: isValid ? 'Provider is healthy' : 'API key validation failed',
        lastCheck: new Date()
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: 'unhealthy',
        latency,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
    }
  }

  /**
   * 记录请求统计
   */
  protected recordRequest(success: boolean, tokens: number, latency: number, cost?: number): void {
    this.stats.totalRequests++;
    this.stats.totalTokens += tokens;

    if (cost) {
      this.stats.totalCost! += cost;
    }

    // 更新成功率
    if (!success) {
      this.stats.successRate =
        ((this.stats.totalRequests - 1) * this.stats.successRate) / this.stats.totalRequests;
    }

    // 更新平均延迟
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift();
    }
    this.stats.averageLatency =
      this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;

    this.stats.lastRequestTime = new Date();
  }

  /**
   * 重试逻辑
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.config.maxRetries ?? 3;
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 如果是不可重试的错误，直接抛出
        if (error instanceof AIError &&
            ['INVALID_API_KEY', 'NOT_SUPPORTED', 'NOT_INITIALIZED'].includes(error.code)) {
          throw error;
        }

        // 指数退避
        if (i < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new AIError(
      'Max retries exceeded',
      'MAX_RETRIES_EXCEEDED',
      this.name as AIProviderType
    );
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 加密API Key（用于安全存储）
   */
  protected encryptApiKey(apiKey: string, secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(secret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密API Key
   */
  protected decryptApiKey(encryptedApiKey: string, secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(secret, 'salt', 32);

    const parts = encryptedApiKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 生成请求ID
   */
  protected generateRequestId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 清理敏感信息（用于日志）
   */
  protected sanitizeForLogging(data: any): any {
    const sanitized = JSON.parse(JSON.stringify(data));

    // 清理API Key
    if (sanitized.apiKey) {
      sanitized.apiKey = '***' + sanitized.apiKey.slice(-4);
    }

    // 清理其他敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'authorization'];

    const sanitizeObject = (obj: any): void => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '***';
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}