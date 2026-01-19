/**
 * OpenAI Provider实现
 * OpenAI GPT模型集成框架
 */

import { BaseAIProvider } from '../base-provider';
import {
  AICapabilities,
  ChatRequest,
  ChatResponse,
  StreamResponse,
  AIError,
  AIProviderType,
  MessageRole,
  ImageAnalysis
} from '../types';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * OpenAI Provider实现
 */
export class OpenAIProvider extends BaseAIProvider {
  name = 'openai';
  version = '1.0.0';

  capabilities: AICapabilities = {
    chat: true,
    stream: true,
    vision: true,
    speech: true,
    embedding: true,
    functionCalling: true,
    maxContextLength: 128000, // GPT-4 Turbo
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt'],
    models: [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-vision-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ]
  };

  private client!: AxiosInstance;
  private defaultModel = 'gpt-3.5-turbo';

  /**
   * 初始化Provider
   */
  async initialize(config: any): Promise<void> {
    await super.initialize(config);

    // 创建Axios客户端
    this.client = axios.create({
      baseURL: config.apiBase || 'https://api.openai.com/v1',
      timeout: config.timeout || 60000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': config.organization || '',
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
      // 获取模型列表来验证API Key
      const response = await this.client.get('/models');
      return response.status === 200;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          return false;
        }
        console.error('OpenAI API validation error:', error.message);
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
        return await this.client.post('/chat/completions', params);
      });

      const data = response.data;
      const latency = Date.now() - startTime;

      // 记录统计
      const usage = data.usage;
      if (usage) {
        const cost = this.calculateCost(usage, data.model);
        this.recordRequest(true, usage.total_tokens, latency, cost);
      }

      // 构建响应
      const choice = data.choices[0];
      const chatResponse: ChatResponse = {
        id: requestId,
        provider: AIProviderType.OPENAI,
        model: data.model,
        message: {
          role: choice.message.role as MessageRole,
          content: choice.message.content || '',
          functionCall: choice.message.function_call,
          name: choice.message.name
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
          AIProviderType.OPENAI,
          error.response?.status,
          error.response?.data
        );
      }

      throw new AIError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR',
        AIProviderType.OPENAI
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
      let model = request.model || this.defaultModel;

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
                provider: AIProviderType.OPENAI,
                model,
                done: true
              };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices[0];

              if (parsed.model) {
                model = parsed.model;
              }

              const streamResponse: StreamResponse = {
                id: requestId,
                provider: AIProviderType.OPENAI,
                model,
                delta: {
                  role: choice.delta.role as MessageRole | undefined,
                  content: choice.delta.content,
                  functionCall: choice.delta.function_call
                },
                finishReason: choice.finish_reason,
                done: false
              };

              yield streamResponse;

            } catch (e) {
              console.error('Failed to parse OpenAI streaming chunk:', e);
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
          AIProviderType.OPENAI,
          error.response?.status
        ) :
        new AIError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          AIProviderType.OPENAI
        );

      yield {
        id: requestId,
        provider: AIProviderType.OPENAI,
        model: request.model || this.defaultModel,
        error: aiError,
        done: true
      };
    }
  }

  /**
   * 文本嵌入
   */
  async embedText(text: string): Promise<number[]> {
    this.ensureInitialized();

    try {
      const response = await this.client.post('/embeddings', {
        model: 'text-embedding-ada-002',
        input: text
      });

      return response.data.data[0].embedding;
    } catch (error) {
      throw new AIError(
        error instanceof Error ? error.message : 'Embedding failed',
        'EMBEDDING_ERROR',
        AIProviderType.OPENAI
      );
    }
  }

  /**
   * 图像分析（使用GPT-4 Vision）
   */
  async analyzeImage(image: Buffer, mimeType?: string): Promise<ImageAnalysis> {
    this.ensureInitialized();

    try {
      // 将图像转换为base64
      const base64Image = image.toString('base64');
      const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Image}`;

      // 使用GPT-4 Vision分析图像
      const response = await this.client.post('/chat/completions', {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this image and describe what you see in detail. Include any text, objects, and their locations if visible.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const description = response.data.choices[0].message.content;

      return {
        description,
        metadata: {
          model: 'gpt-4-vision-preview',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      throw new AIError(
        error instanceof Error ? error.message : 'Image analysis failed',
        'IMAGE_ANALYSIS_ERROR',
        AIProviderType.OPENAI
      );
    }
  }

  /**
   * 语音合成
   */
  async synthesizeSpeech(text: string, voice: string = 'alloy'): Promise<Buffer> {
    this.ensureInitialized();

    try {
      const response = await this.client.post(
        '/audio/speech',
        {
          model: 'tts-1',
          input: text,
          voice: voice // alloy, echo, fable, onyx, nova, shimmer
        },
        {
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      throw new AIError(
        error instanceof Error ? error.message : 'Speech synthesis failed',
        'SPEECH_SYNTHESIS_ERROR',
        AIProviderType.OPENAI
      );
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
      max_tokens: request.maxTokens,
      top_p: request.topP ?? 1,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0
    };

    // 添加函数调用支持
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools;
      params.tool_choice = 'auto';
    }

    // 添加响应格式（JSON模式）
    if (request.model?.includes('gpt-4-turbo') || request.model === 'gpt-3.5-turbo-1106') {
      params.response_format = { type: 'json_object' };
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

  /**
   * 计算成本（OpenAI定价）
   */
  private calculateCost(usage: any, model: string): number {
    // OpenAI定价（美元/1K tokens）
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-32k': { input: 0.06, output: 0.12 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

    return (usage.prompt_tokens * modelPricing.input / 1000) +
           (usage.completion_tokens * modelPricing.output / 1000);
  }
}