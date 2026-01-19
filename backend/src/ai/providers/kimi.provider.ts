/**
 * Kimi AI Provider实现
 * Moonshot Kimi模型集成框架
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
 * Kimi Provider实现
 */
export class KimiProvider extends BaseAIProvider {
  name = 'kimi';
  version = '1.0.0';

  capabilities: AICapabilities = {
    chat: true,
    stream: true,
    vision: false,
    speech: false,
    embedding: false,
    functionCalling: true,
    maxContextLength: 128000, // Kimi支持超长上下文
    supportedLanguages: ['zh', 'en'],
    models: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k'
    ]
  };

  private client!: AxiosInstance;
  private defaultModel = 'moonshot-v1-8k';

  /**
   * 初始化Provider
   */
  async initialize(config: any): Promise<void> {
    await super.initialize(config);

    // 创建Axios客户端
    this.client = axios.create({
      baseURL: config.apiBase || 'https://api.moonshot.cn/v1',
      timeout: config.timeout || 60000, // Kimi需要更长的超时时间
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    if (config.defaultModel) {
      this.defaultModel = config.defaultModel;
    }
  }

  /**
   * 验证API Key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // 发送测试请求
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
        if (error.response?.status === 401 || error.response?.status === 403) {
          return false;
        }
        console.error('Kimi API validation error:', error.message);
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
      // 选择合适的模型（基于上下文长度）
      const model = this.selectModelByContextLength(request);

      // 构建请求参数
      const params = this.buildRequestParams(request, model);

      // 发送请求
      const response = await this.withRetry(async () => {
        return await this.client.post('/chat/completions', params);
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
        provider: AIProviderType.KIMI,
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
          AIProviderType.KIMI,
          error.response?.status,
          error.response?.data
        );
      }

      throw new AIError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR',
        AIProviderType.KIMI
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
      // 选择合适的模型
      const model = this.selectModelByContextLength(request);

      // 构建请求参数（启用流式）
      const params = {
        ...this.buildRequestParams(request, model),
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
                provider: AIProviderType.KIMI,
                model,
                done: true
              };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices[0];

              if (parsed.usage) {
                totalTokens = parsed.usage.total_tokens;
              }

              const streamResponse: StreamResponse = {
                id: requestId,
                provider: AIProviderType.KIMI,
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
              console.error('Failed to parse Kimi streaming chunk:', e);
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
          AIProviderType.KIMI,
          error.response?.status
        ) :
        new AIError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          AIProviderType.KIMI
        );

      yield {
        id: requestId,
        provider: AIProviderType.KIMI,
        model: this.defaultModel,
        error: aiError,
        done: true
      };
    }
  }

  /**
   * 根据上下文长度选择模型
   */
  private selectModelByContextLength(request: ChatRequest): string {
    if (request.model) {
      return request.model;
    }

    // 估算上下文长度（简单估算，每个字符约1.5个token）
    const contextLength = this.estimateTokenCount(request);

    if (contextLength > 32000) {
      return 'moonshot-v1-128k';
    } else if (contextLength > 8000) {
      return 'moonshot-v1-32k';
    } else {
      return 'moonshot-v1-8k';
    }
  }

  /**
   * 估算Token数量
   */
  private estimateTokenCount(request: ChatRequest): number {
    let totalChars = 0;

    if (request.systemPrompt) {
      totalChars += request.systemPrompt.length;
    }

    for (const msg of request.messages) {
      totalChars += msg.content.length;
    }

    // 粗略估算：中文约2个字符1个token，英文约4个字符1个token
    // 这里使用平均值1.5
    return Math.ceil(totalChars / 1.5);
  }

  /**
   * 构建请求参数
   */
  private buildRequestParams(request: ChatRequest, model: string): any {
    const params: any = {
      model,
      messages: this.formatMessages(request),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
      top_p: request.topP ?? 0.95,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0
    };

    // 添加工具支持
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools;
      params.tool_choice = 'auto';
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