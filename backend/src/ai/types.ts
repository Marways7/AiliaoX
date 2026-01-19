/**
 * AI Provider 类型定义
 * 定义了AI模型交互的统一接口和数据结构
 */

/**
 * 支持的AI提供商
 */
export enum AIProviderType {
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  KIMI = 'kimi',
  OPENAI = 'openai'
}

/**
 * 消息角色类型
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function'
}

/**
 * 消息接口
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string; // 函数调用时的函数名
  functionCall?: FunctionCall; // 函数调用信息
}

/**
 * 函数调用接口
 */
export interface FunctionCall {
  name: string;
  arguments: string;
}

/**
 * 工具定义接口
 */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters?: Record<string, any>;
  };
}

/**
 * 聊天请求接口
 */
export interface ChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  tools?: Tool[];
  stream?: boolean;
  context?: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * 聊天响应接口
 */
export interface ChatResponse {
  id: string;
  provider: AIProviderType;
  model: string;
  message: Message;
  usage?: TokenUsage;
  finishReason?: string;
  error?: AIError;
}

/**
 * 流式响应接口
 */
export interface StreamResponse {
  id: string;
  provider: AIProviderType;
  model: string;
  delta?: {
    content?: string;
    role?: MessageRole;
    functionCall?: Partial<FunctionCall>;
  };
  usage?: TokenUsage;
  finishReason?: string;
  done?: boolean;
  error?: AIError;
}

/**
 * Token使用统计
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * AI能力定义
 */
export interface AICapabilities {
  chat: boolean;
  stream: boolean;
  vision: boolean;
  speech: boolean;
  embedding: boolean;
  functionCalling: boolean;
  maxContextLength: number;
  supportedLanguages: string[];
  models: string[];
}

/**
 * AI Provider配置
 */
export interface ProviderConfig {
  apiKey: string;
  apiBase?: string;
  organization?: string;
  defaultModel?: string;
  maxRetries?: number;
  timeout?: number;
  proxy?: string;
  headers?: Record<string, string>;
}

/**
 * AI错误定义
 */
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: AIProviderType,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * 使用统计接口
 */
export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost?: number;
  successRate: number;
  averageLatency: number;
  lastRequestTime?: Date;
}

/**
 * 健康检查状态
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  lastCheck: Date;
}

/**
 * 图像分析结果
 */
export interface ImageAnalysis {
  description: string;
  objects?: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text?: Array<{
    content: string;
    confidence: number;
    location?: {
      x: number;
      y: number;
    };
  }>;
  metadata?: Record<string, any>;
}

/**
 * AI Provider接口
 */
export interface IAIProvider {
  // 基本信息
  name: string;
  version: string;
  capabilities: AICapabilities;

  // 初始化与配置
  initialize(config: ProviderConfig): Promise<void>;
  updateConfig(config: Partial<ProviderConfig>): void;

  // 对话接口
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat(request: ChatRequest): AsyncIterableIterator<StreamResponse>;

  // 高级功能（可选）
  embedText?(text: string): Promise<number[]>;
  analyzeImage?(image: Buffer, mimeType?: string): Promise<ImageAnalysis>;
  synthesizeSpeech?(text: string, voice?: string): Promise<Buffer>;

  // 状态管理
  getUsage(): UsageStats;
  validateApiKey(): Promise<boolean>;
  healthCheck(): Promise<HealthStatus>;
}