/**
 * JSON-RPC 2.0 消息处理器
 * 负责处理MCP协议的消息编解码和路由
 */

import { EventEmitter } from 'events';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  JsonRpcError,
  JsonRpcId,
  JSON_RPC_VERSION,
  MCPError,
  MCPErrorCode,
} from './types';
import { Logger } from '../utils/logger';

/**
 * 待处理的请求
 */
interface PendingRequest {
  id: JsonRpcId;
  method: string;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  timeout?: NodeJS.Timeout;
}

/**
 * JSON-RPC 2.0 消息处理器
 */
export class MessageHandler extends EventEmitter {
  private pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private logger: Logger;
  private requestTimeout: number;
  private nextId: number = 1;

  constructor(options?: {
    logger?: Logger;
    requestTimeout?: number;
  }) {
    super();
    this.logger = options?.logger || new Logger('MessageHandler');
    this.requestTimeout = options?.requestTimeout || 30000; // 默认30秒超时
  }

  /**
   * 创建JSON-RPC请求
   */
  createRequest(method: string, params?: any): JsonRpcRequest {
    const id = this.generateId();
    return {
      jsonrpc: JSON_RPC_VERSION,
      id,
      method,
      params,
    };
  }

  /**
   * 创建JSON-RPC通知（无需响应）
   */
  createNotification(method: string, params?: any): JsonRpcNotification {
    return {
      jsonrpc: JSON_RPC_VERSION,
      method,
      params,
    };
  }

  /**
   * 创建JSON-RPC响应
   */
  createResponse(id: JsonRpcId, result?: any, error?: JsonRpcError): JsonRpcResponse {
    const response: JsonRpcResponse = {
      jsonrpc: JSON_RPC_VERSION,
      id,
    };

    if (error) {
      response.error = error;
    } else {
      response.result = result ?? null;
    }

    return response;
  }

  /**
   * 创建错误响应
   */
  createErrorResponse(id: JsonRpcId, error: MCPError): JsonRpcResponse {
    return this.createResponse(id, undefined, error.toJsonRpcError());
  }

  /**
   * 发送请求并等待响应
   */
  async sendRequest(
    method: string,
    params: any,
    send: (message: any) => Promise<void>
  ): Promise<any> {
    const request = this.createRequest(method, params);

    // 创建Promise等待响应
    const promise = new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new MCPError(
          MCPErrorCode.TIMEOUT_ERROR,
          `Request timeout: ${method}`
        ));
      }, this.requestTimeout);

      // 保存待处理请求
      this.pendingRequests.set(request.id, {
        id: request.id,
        method,
        resolve,
        reject,
        timeout,
      });
    });

    // 发送请求
    try {
      await send(request);
      this.logger.debug(`Sent request: ${method} (id: ${request.id})`);
    } catch (error) {
      // 发送失败，清理待处理请求
      const pending = this.pendingRequests.get(request.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(request.id);
      }
      throw error;
    }

    return promise;
  }

  /**
   * 发送通知（不等待响应）
   */
  async sendNotification(
    method: string,
    params: any,
    send: (message: any) => Promise<void>
  ): Promise<void> {
    const notification = this.createNotification(method, params);
    await send(notification);
    this.logger.debug(`Sent notification: ${method}`);
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(message: any): void {
    try {
      // 验证消息格式
      if (!this.isValidMessage(message)) {
        this.logger.error('Invalid message format:', message);
        this.emit('error', new MCPError(
          MCPErrorCode.INVALID_REQUEST,
          'Invalid message format'
        ));
        return;
      }

      // 判断消息类型
      if (this.isResponse(message)) {
        this.handleResponse(message as JsonRpcResponse);
      } else if (this.isRequest(message)) {
        this.handleRequest(message as JsonRpcRequest);
      } else if (this.isNotification(message)) {
        this.handleNotification(message as JsonRpcNotification);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      this.emit('error', error);
    }
  }

  /**
   * 处理响应消息
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      this.logger.warn(`No pending request for response id: ${response.id}`);
      return;
    }

    // 清理待处理请求
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    // 处理响应
    if (response.error) {
      this.logger.debug(`Received error response for ${pending.method}:`, response.error);
      pending.reject(new MCPError(
        response.error.code,
        response.error.message,
        response.error.data
      ));
    } else {
      this.logger.debug(`Received success response for ${pending.method}`);
      pending.resolve(response.result);
    }
  }

  /**
   * 处理请求消息
   */
  private handleRequest(request: JsonRpcRequest): void {
    this.logger.debug(`Received request: ${request.method} (id: ${request.id})`);

    // 触发请求事件，由上层处理
    this.emit('request', request);
  }

  /**
   * 处理通知消息
   */
  private handleNotification(notification: JsonRpcNotification): void {
    this.logger.debug(`Received notification: ${notification.method}`);

    // 触发通知事件，由上层处理
    this.emit('notification', notification);
  }

  /**
   * 验证消息格式
   */
  private isValidMessage(message: any): boolean {
    return (
      typeof message === 'object' &&
      message !== null &&
      message.jsonrpc === JSON_RPC_VERSION
    );
  }

  /**
   * 判断是否为响应消息
   */
  private isResponse(message: any): boolean {
    return 'id' in message && ('result' in message || 'error' in message);
  }

  /**
   * 判断是否为请求消息
   */
  private isRequest(message: any): boolean {
    return 'id' in message && 'method' in message && !('result' in message) && !('error' in message);
  }

  /**
   * 判断是否为通知消息
   */
  private isNotification(message: any): boolean {
    return !('id' in message) && 'method' in message;
  }

  /**
   * 生成请求ID
   */
  private generateId(): JsonRpcId {
    // 使用递增的数字ID，更简洁
    return this.nextId++;
  }

  /**
   * 清理所有待处理请求
   */
  clearPendingRequests(error?: MCPError): void {
    const err = error || new MCPError(
      MCPErrorCode.INTERNAL_ERROR,
      'All pending requests cleared'
    );

    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(err);
    });

    this.pendingRequests.clear();
  }

  /**
   * 获取待处理请求数量
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 获取待处理请求列表（用于调试）
   */
  getPendingRequests(): Array<{ id: JsonRpcId; method: string }> {
    return Array.from(this.pendingRequests.values()).map(p => ({
      id: p.id,
      method: p.method,
    }));
  }
}