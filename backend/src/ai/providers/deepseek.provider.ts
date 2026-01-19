/**
 * DeepSeek AI Provider实现
 * 提供DeepSeek模型的完整集成
 */

import { BaseAIProvider } from '../base-provider';
import {
  AICapabilities,
  ChatRequest,
  ChatResponse,
  StreamResponse,
  AIError,
  AIProviderType,
  MessageRole
} from '../types';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * DeepSeek API响应接口
 */
interface DeepSeekChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek流式响应接口
 */
interface DeepSeekStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek Provider实现
 */
export class DeepSeekProvider extends BaseAIProvider {
  name = 'deepseek';
  version = '1.0.0';

  capabilities: AICapabilities = {
    chat: true,
    stream: true,
    vision: false,
    speech: false,
    embedding: false,
    functionCalling: true,
    maxContextLength: 16384,
    supportedLanguages: ['zh', 'en'],
    models: [
      'deepseek-chat',
      'deepseek-coder'
    ]
  };

  private client!: AxiosInstance;
  private defaultModel = 'deepseek-chat';

  /**
   * 初始化Provider
   */
  async initialize(config: any): Promise<void> {
    // 先设置apiKey，因为validateApiKey需要用到
    this.apiKey = config.apiKey;
    this.apiBase = config.apiBase;

    // 创建Axios客户端（必须在super.initialize之前，因为validateApiKey需要用到client）
    this.client = axios.create({
      baseURL: config.apiBase || 'https://api.deepseek.com/v1',
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    // 设置默认模型
    if (config.defaultModel) {
      this.defaultModel = config.defaultModel;
    }

    // 最后调用父类初始化（会调用validateApiKey）
    await super.initialize(config);
  }

  /**
   * 验证API Key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // 发送一个简单的测试请求
      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: 'test'
          }
        ],
        max_tokens: 1
      });

      return response.status === 200;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('DeepSeek API validation error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          apiKey: this.apiKey?.substring(0, 10) + '...',
          apiBase: this.apiBase
        });

        if (error.response?.status === 401) {
          return false;
        }
        // 其他错误可能是网络问题，不一定是API Key无效
        console.error('DeepSeek API validation error:', error.message);
      }
      return false;
    }
  }

  /**
   * 对话接口
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 构建请求参数
      const params = this.buildRequestParams(request);

      // 发送请求
      const response = await this.withRetry(async () => {
        return await this.client.post<DeepSeekChatResponse>(
          '/chat/completions',
          params
        );
      });

      const data = response.data;
      const latency = Date.now() - startTime;

      // 记录统计
      const usage = data.usage;
      if (usage) {
        this.recordRequest(true, usage.total_tokens, latency);
      }

      // 构建响应
      const choice = data.choices[0];
      const chatResponse: ChatResponse = {
        id: requestId,
        provider: AIProviderType.DEEPSEEK,
        model: data.model,
        message: {
          role: choice.message.role as MessageRole,
          content: choice.message.content,
          functionCall: choice.message.function_call
        },
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : undefined,
        finishReason: choice.finish_reason
      };

      return chatResponse;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordRequest(false, 0, latency);

      if (error instanceof AxiosError) {
        throw new AIError(
          error.response?.data?.error?.message || error.message,
          'API_ERROR',
          AIProviderType.DEEPSEEK,
          error.response?.status,
          error.response?.data
        );
      }

      throw new AIError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR',
        AIProviderType.DEEPSEEK
      );
    }
  }

  /**
   * 流式对话接口
   */
  async *streamChat(request: ChatRequest): AsyncIterableIterator<StreamResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    const requestId = this.generateRequestId();
    let totalTokens = 0;

    try {
      // 构建请求参数（启用流式）
      const params = {
        ...this.buildRequestParams(request),
        stream: true
      };

      // 发送流式请求
      const response = await this.client.post('/chat/completions', params, {
        responseType: 'stream'
      });

      // 处理流式响应
      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              const latency = Date.now() - startTime;
              this.recordRequest(true, totalTokens, latency);

              yield {
                id: requestId,
                provider: AIProviderType.DEEPSEEK,
                model: this.defaultModel,
                done: true
              };
              return;
            }

            try {
              const parsed: DeepSeekStreamChunk = JSON.parse(data);
              const choice = parsed.choices[0];

              if (parsed.usage) {
                totalTokens = parsed.usage.total_tokens;
              }

              const streamResponse: StreamResponse = {
                id: requestId,
                provider: AIProviderType.DEEPSEEK,
                model: parsed.model,
                delta: {
                  role: choice.delta.role as MessageRole | undefined,
                  content: choice.delta.content,
                  functionCall: choice.delta.function_call
                },
                usage: parsed.usage ? {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens
                } : undefined,
                finishReason: choice.finish_reason,
                done: false
              };

              yield streamResponse;

            } catch (e) {
              console.error('Failed to parse streaming chunk:', e);
            }
          }
        }
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordRequest(false, 0, latency);

      const aiError = error instanceof AxiosError ?
        new AIError(
          error.response?.data?.error?.message || error.message,
          'STREAM_ERROR',
          AIProviderType.DEEPSEEK,
          error.response?.status
        ) :
        new AIError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          AIProviderType.DEEPSEEK
        );

      yield {
        id: requestId,
        provider: AIProviderType.DEEPSEEK,
        model: this.defaultModel,
        error: aiError,
        done: true
      };
    }
  }

  /**
   * 构建请求参数
   */
  private buildRequestParams(request: ChatRequest): any {
    const params: any = {
      model: request.model || this.defaultModel,
      messages: this.formatMessages(request),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
      top_p: request.topP ?? 0.95,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0
    };

    // 添加工具支持
    if (request.tools && request.tools.length > 0) {
      params.functions = request.tools.map(tool => tool.function);
      params.function_call = 'auto';
    }

    return params;
  }

  /**
   * 格式化消息
   */
  private formatMessages(request: ChatRequest): Array<any> {
    const messages: Array<any> = [];

    // 添加系统提示
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    // 添加对话消息
    for (const msg of request.messages) {
      const formattedMsg: any = {
        role: msg.role,
        content: msg.content
      };

      if (msg.name) {
        formattedMsg.name = msg.name;
      }

      if (msg.functionCall) {
        formattedMsg.function_call = msg.functionCall;
      }

      messages.push(formattedMsg);
    }

    return messages;
  }
}