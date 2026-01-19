/**
 * MCP Client 主类
 * 实现完整的MCP协议客户端功能
 */

import { EventEmitter } from 'events';
import {
  Transport,
  MCPTool,
  MCPResource,
  MCPPrompt,
  QueryContext,
  QueryResult,
  TransactionResult,
  ConnectionMetrics,
  MCPError,
  MCPErrorCode,
  InitializeParams,
  InitializeResult,
  ToolCallRequest,
  ToolCallResponse,
  ErrorHandler,
  ConnectionStateHandler,
  ClientCapabilities,
  ServerCapabilities,
} from './types';
import { StdioTransport } from './transports/stdio.transport';
import { MessageHandler } from './message-handler';
import { ConfigLoader } from './config-loader';
import { Logger } from '../utils/logger';

/**
 * MCP Client选项
 */
export interface MCPClientOptions {
  configPath?: string;
  logger?: Logger;
  autoConnect?: boolean;
  connectionTimeout?: number;
}

/**
 * MCP Client主类
 */
export class MCPClient extends EventEmitter {
  private transport: Transport | null = null;
  private messageHandler: MessageHandler;
  private configLoader: ConfigLoader;
  private logger: Logger;
  private connected: boolean = false;
  private initialized: boolean = false;
  private serverCapabilities: ServerCapabilities | null = null;
  private currentServerName: string | null = null;
  private metrics: ConnectionMetrics;
  private retryCount: number = 0;
  private connectionStartTime: number = 0;

  constructor(options: MCPClientOptions = {}) {
    super();
    this.logger = options.logger || new Logger('MCPClient');
    this.configLoader = new ConfigLoader(options.configPath, this.logger);
    this.messageHandler = new MessageHandler({
      logger: this.logger,
      requestTimeout: options.connectionTimeout || 30000,
    });

    // 初始化指标
    this.metrics = {
      connected: false,
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
    };

    // 设置消息处理器的事件监听
    this.setupMessageHandlerListeners();
  }

  /**
   * 连接到MCP服务器
   */
  async connect(serverName?: string): Promise<void> {
    try {
      this.logger.info(`Connecting to MCP server: ${serverName || 'default'}`);

      // 加载配置
      const config = await this.configLoader.loadConfig();
      const serverConfig = this.configLoader.getServerConfig(serverName);

      // 创建Transport
      this.transport = new StdioTransport(serverConfig, this.logger);

      // 设置Transport事件监听
      this.setupTransportListeners();

      // 连接到服务器
      await (this.transport as StdioTransport).connect();

      this.currentServerName = serverName || config.defaultServer || 'default';
      this.connected = true;
      this.connectionStartTime = Date.now();
      this.metrics.connected = true;

      // 初始化协议
      await this.initialize();

      this.logger.info('Successfully connected and initialized MCP server');
      this.emit('connected', this.currentServerName);
    } catch (error) {
      this.logger.error('Failed to connect:', error);

      // 重试连接
      if (await this.shouldRetry()) {
        await this.retryConnection(serverName);
      } else {
        throw error;
      }
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting from MCP server');

    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }

    this.connected = false;
    this.initialized = false;
    this.serverCapabilities = null;
    this.metrics.connected = false;
    this.messageHandler.clearPendingRequests();

    this.emit('disconnected');
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected && this.initialized && (this.transport?.isConnected() ?? false);
  }

  /**
   * 初始化MCP协议
   */
  private async initialize(): Promise<void> {
    this.logger.info('Initializing MCP protocol');

    const params: InitializeParams = {
      protocolVersion: '1.0',
      capabilities: this.getClientCapabilities(),
      clientInfo: {
        name: 'AiliaoX MCP Client',
        version: '1.0.0',
      },
    };

    const result = await this.sendRequest<InitializeResult>('initialize', params);

    this.serverCapabilities = result.capabilities;
    this.initialized = true;

    // 发送initialized通知
    await this.sendNotification('initialized', {});

    this.logger.info('MCP protocol initialized', result.serverInfo);
  }

  /**
   * 获取客户端能力
   */
  private getClientCapabilities(): ClientCapabilities {
    return {
      tools: {
        call: true,
      },
      resources: {
        read: true,
        write: false, // 暂不支持写入
      },
      prompts: {
        list: true,
      },
    };
  }

  /**
   * 列出可用工具
   */
  async listTools(): Promise<MCPTool[]> {
    this.ensureConnected();

    if (!this.serverCapabilities?.tools?.list) {
      return [];
    }

    const response = await this.sendRequest('tools/list', {});
    return response.tools || [];
  }

  /**
   * 获取特定工具信息
   */
  async getTool(name: string): Promise<MCPTool | null> {
    const tools = await this.listTools();
    return tools.find(tool => tool.name === name) || null;
  }

  /**
   * 调用工具
   */
  async callTool(name: string, params?: any): Promise<ToolCallResponse> {
    this.ensureConnected();

    const request: ToolCallRequest = {
      name,
      arguments: params,
    };

    const startTime = Date.now();

    try {
      const response = await this.sendRequest<ToolCallResponse>('tools/call', request);

      // 更新指标
      this.metrics.requestCount++;
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      return response;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  /**
   * 执行查询（专门用于数据库查询）
   */
  async executeQuery(query: string, context?: QueryContext): Promise<QueryResult> {
    try {
      // 使用工具调用来执行查询
      const response = await this.callTool('query', {
        sql: query,
        ...context,
      });

      // 解析响应
      const content = response.content?.[0];

      if (content?.type === 'error') {
        return {
          success: false,
          error: content.text || 'Query execution failed',
        };
      }

      return {
        success: true,
        data: content?.data || content?.text,
        metadata: {
          executionTime: Date.now() - Date.now(), // 需要改进
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 执行事务
   */
  async executeTransaction(queries: string[]): Promise<TransactionResult> {
    try {
      const response = await this.callTool('transaction', {
        queries,
      });

      const results: QueryResult[] = [];
      let allSuccess = true;

      for (const content of response.content) {
        if (content.type === 'error') {
          allSuccess = false;
          results.push({
            success: false,
            error: content.text,
          });
        } else {
          results.push({
            success: true,
            data: content.data || content.text,
          });
        }
      }

      return {
        success: allSuccess,
        results,
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  /**
   * 列出可用资源
   */
  async listResources(): Promise<MCPResource[]> {
    this.ensureConnected();

    if (!this.serverCapabilities?.resources?.list) {
      return [];
    }

    const response = await this.sendRequest('resources/list', {});
    return response.resources || [];
  }

  /**
   * 读取资源
   */
  async readResource(uri: string): Promise<any> {
    this.ensureConnected();

    if (!this.serverCapabilities?.resources?.read) {
      throw new MCPError(
        MCPErrorCode.METHOD_NOT_FOUND,
        'Server does not support reading resources'
      );
    }

    const response = await this.sendRequest('resources/read', { uri });
    return response.content;
  }

  /**
   * 列出可用提示
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    this.ensureConnected();

    if (!this.serverCapabilities?.prompts?.list) {
      return [];
    }

    const response = await this.sendRequest('prompts/list', {});
    return response.prompts || [];
  }

  /**
   * 获取连接指标
   */
  getMetrics(): ConnectionMetrics {
    if (this.connected && this.connectionStartTime) {
      this.metrics.uptime = Date.now() - this.connectionStartTime;
    }
    return { ...this.metrics };
  }

  /**
   * 设置错误处理器
   */
  onError(handler: ErrorHandler): void {
    this.on('error', handler);
  }

  /**
   * 设置连接状态变化处理器
   */
  onConnectionStateChange(handler: ConnectionStateHandler): void {
    this.on('connected', () => handler(true));
    this.on('disconnected', () => handler(false));
  }

  /**
   * 发送请求
   */
  private async sendRequest<T = any>(method: string, params?: any): Promise<T> {
    this.ensureConnected();

    return this.messageHandler.sendRequest(
      method,
      params,
      (message) => this.transport!.send(message)
    );
  }

  /**
   * 发送通知
   */
  private async sendNotification(method: string, params?: any): Promise<void> {
    this.ensureConnected();

    await this.messageHandler.sendNotification(
      method,
      params,
      (message) => this.transport!.send(message)
    );
  }

  /**
   * 确保已连接
   */
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new MCPError(
        MCPErrorCode.CONNECTION_ERROR,
        'Not connected to MCP server'
      );
    }
  }

  /**
   * 设置消息处理器监听
   */
  private setupMessageHandlerListeners(): void {
    // 处理服务器请求
    this.messageHandler.on('request', (request) => {
      this.logger.debug('Received server request:', request);
      // 可以在这里处理服务器发来的请求
      this.emit('serverRequest', request);
    });

    // 处理服务器通知
    this.messageHandler.on('notification', (notification) => {
      this.logger.debug('Received server notification:', notification);
      this.emit('serverNotification', notification);
    });

    // 处理错误
    this.messageHandler.on('error', (error) => {
      this.logger.error('Message handler error:', error);
      this.metrics.errorCount++;
      this.emit('error', error);
    });
  }

  /**
   * 设置Transport监听
   */
  private setupTransportListeners(): void {
    if (!this.transport) return;

    const transport = this.transport as StdioTransport;

    // 处理接收到的消息
    transport.on('message', (message) => {
      this.messageHandler.handleMessage(message);
    });

    // 处理连接断开
    transport.on('disconnect', () => {
      this.logger.warn('Transport disconnected');
      this.connected = false;
      this.initialized = false;
      this.metrics.connected = false;
      this.emit('disconnected');
    });

    // 处理错误
    transport.on('error', (error) => {
      this.logger.error('Transport error:', error);
      this.metrics.errorCount++;
      this.emit('error', error);
    });
  }

  /**
   * 判断是否应该重试
   */
  private async shouldRetry(): Promise<boolean> {
    const retryConfig = this.configLoader.getRetryConfig();

    if (!retryConfig || this.retryCount >= retryConfig.maxRetries) {
      this.logger.error(`Max retry attempts (${retryConfig?.maxRetries || 0}) reached`);
      return false;
    }

    return true;
  }

  /**
   * 重试连接
   */
  private async retryConnection(serverName?: string): Promise<void> {
    const retryConfig = this.configLoader.getRetryConfig();

    if (!retryConfig) {
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        'Retry configuration not available'
      );
    }

    this.retryCount++;

    const delay = retryConfig.retryDelay * Math.pow(
      retryConfig.backoffMultiplier || 2,
      this.retryCount - 1
    );

    this.logger.info(`Retrying connection (attempt ${this.retryCount}) after ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect(serverName);
      this.retryCount = 0; // 重置重试计数
    } catch (error) {
      if (await this.shouldRetry()) {
        await this.retryConnection(serverName);
      } else {
        throw error;
      }
    }
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(responseTime: number): void {
    const currentAvg = this.metrics.averageResponseTime;
    const count = this.metrics.requestCount;

    this.metrics.averageResponseTime = (currentAvg * (count - 1) + responseTime) / count;
  }

  /**
   * 切换服务器
   */
  async switchServer(serverName: string): Promise<void> {
    this.logger.info(`Switching to server: ${serverName}`);

    // 断开当前连接
    if (this.connected) {
      await this.disconnect();
    }

    // 连接到新服务器
    await this.connect(serverName);
  }

  /**
   * 获取当前服务器名称
   */
  getCurrentServerName(): string | null {
    return this.currentServerName;
  }

  /**
   * 获取服务器能力
   */
  getServerCapabilities(): ServerCapabilities | null {
    return this.serverCapabilities;
  }
}