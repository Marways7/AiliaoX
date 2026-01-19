/**
 * Gemini AI Provider实现
 * Google Gemini模型集成框架
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
 * Gemini Provider实现
 */
export class GeminiProvider extends BaseAIProvider {
  name = 'gemini';
  version = '1.0.0';

  capabilities: AICapabilities = {
    chat: true,
    stream: true,
    vision: true,
    speech: false,
    embedding: true,
    functionCalling: true,
    maxContextLength: 32768,
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru'],
    models: [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-ultra'
    ]
  };

  private client!: AxiosInstance;
  private defaultModel = 'gemini-pro';

  /**
   * 初始化Provider
   */
  async initialize(config: any): Promise<void> {
    await super.initialize(config);

    // 创建Axios客户端
    this.client = axios.create({
      baseURL: config.apiBase || 'https://generativelanguage.googleapis.com/v1beta',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      params: {
        key: this.apiKey
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
      const response = await this.client.post(
        `/models/${this.defaultModel}:generateContent`,
        {
          contents: [{
            parts: [{
              text: 'test'
            }]
          }],
          generationConfig: {
            maxOutputTokens: 1
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return false;
        }
        console.error('Gemini API validation error:', error.message);
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
      // 构建Gemini请求格式
      const geminiRequest = this.buildGeminiRequest(request);

      // 发送请求
      const response = await this.withRetry(async () => {
        return await this.client.post(
          `/models/${request.model || this.defaultModel}:generateContent`,
          geminiRequest
        );
      });

      const data = response.data;
      const latency = Date.now() - startTime;

      // 提取响应内容
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';

      // 记录统计
      const tokenCount = data.usageMetadata?.totalTokenCount || 0;
      this.recordRequest(true, tokenCount, latency);

      // 构建响应
      const chatResponse: ChatResponse = {
        id: requestId,
        provider: AIProviderType.GEMINI,
        model: request.model || this.defaultModel,
        message: {
          role: MessageRole.ASSISTANT,
          content: content
        },
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0
        } : undefined,
        finishReason: candidate?.finishReason
      };

      return chatResponse;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordRequest(false, 0, latency);

      if (error instanceof AxiosError) {
        throw new AIError(
          error.response?.data?.error?.message || error.message,
          'API_ERROR',
          AIProviderType.GEMINI,
          error.response?.status,
          error.response?.data
        );
      }

      throw new AIError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR',
        AIProviderType.GEMINI
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

    try {
      // 构建Gemini流式请求
      const geminiRequest = this.buildGeminiRequest(request);

      // 发送流式请求
      const response = await this.client.post(
        `/models/${request.model || this.defaultModel}:streamGenerateContent`,
        geminiRequest,
        {
          responseType: 'stream'
        }
      );

      // 处理流式响应
      const stream = response.data;
      let buffer = '';
      let totalTokens = 0;

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const parsed = JSON.parse(line);
            const candidate = parsed.candidates?.[0];
            const content = candidate?.content?.parts?.[0]?.text || '';

            if (parsed.usageMetadata) {
              totalTokens = parsed.usageMetadata.totalTokenCount || 0;
            }

            const streamResponse: StreamResponse = {
              id: requestId,
              provider: AIProviderType.GEMINI,
              model: request.model || this.defaultModel,
              delta: {
                content: content,
                role: MessageRole.ASSISTANT
              },
              usage: parsed.usageMetadata ? {
                promptTokens: parsed.usageMetadata.promptTokenCount || 0,
                completionTokens: parsed.usageMetadata.candidatesTokenCount || 0,
                totalTokens: parsed.usageMetadata.totalTokenCount || 0
              } : undefined,
              finishReason: candidate?.finishReason,
              done: candidate?.finishReason === 'STOP'
            };

            yield streamResponse;

          } catch (e) {
            console.error('Failed to parse Gemini streaming chunk:', e);
          }
        }
      }

      const latency = Date.now() - startTime;
      this.recordRequest(true, totalTokens, latency);

      // 发送完成信号
      yield {
        id: requestId,
        provider: AIProviderType.GEMINI,
        model: request.model || this.defaultModel,
        done: true
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordRequest(false, 0, latency);

      const aiError = error instanceof AxiosError ?
        new AIError(
          error.response?.data?.error?.message || error.message,
          'STREAM_ERROR',
          AIProviderType.GEMINI,
          error.response?.status
        ) :
        new AIError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          AIProviderType.GEMINI
        );

      yield {
        id: requestId,
        provider: AIProviderType.GEMINI,
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
      const response = await this.client.post(
        `/models/embedding-001:embedContent`,
        {
          model: 'models/embedding-001',
          content: {
            parts: [{
              text: text
            }]
          }
        }
      );

      return response.data.embedding.values;
    } catch (error) {
      throw new AIError(
        error instanceof Error ? error.message : 'Embedding failed',
        'EMBEDDING_ERROR',
        AIProviderType.GEMINI
      );
    }
  }

  /**
   * 构建Gemini请求格式
   */
  private buildGeminiRequest(request: ChatRequest): any {
    // 转换消息格式
    const contents = this.convertToGeminiFormat(request);

    const geminiRequest: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
        topP: request.topP ?? 0.95,
        topK: 40
      }
    };

    // 添加安全设置
    geminiRequest.safetySettings = [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ];

    return geminiRequest;
  }

  /**
   * 转换消息格式为Gemini格式
   */
  private convertToGeminiFormat(request: ChatRequest): any[] {
    const contents: any[] = [];
    let currentRole = '';
    let currentParts: any[] = [];

    // 添加系统提示（如果有）
    if (request.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: request.systemPrompt }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow your instructions.' }]
      });
    }

    // 转换消息
    for (const msg of request.messages) {
      const geminiRole = msg.role === MessageRole.ASSISTANT ? 'model' : 'user';

      if (geminiRole !== currentRole && currentParts.length > 0) {
        contents.push({
          role: currentRole,
          parts: currentParts
        });
        currentParts = [];
      }

      currentRole = geminiRole;
      currentParts.push({ text: msg.content });
    }

    if (currentParts.length > 0) {
      contents.push({
        role: currentRole,
        parts: currentParts
      });
    }

    return contents;
  }
}