/**
 * Message Handler 单元测试
 */

import { MessageHandler } from '../../src/mcp/message-handler';
import { MCPError, MCPErrorCode, JSON_RPC_VERSION } from '../../src/mcp/types';

describe('MessageHandler', () => {
  let handler: MessageHandler;

  beforeEach(() => {
    handler = new MessageHandler({
      requestTimeout: 1000, // 1秒超时，便于测试
    });
  });

  afterEach(() => {
    handler.clearPendingRequests();
  });

  describe('Request Creation', () => {
    it('should create valid JSON-RPC request', () => {
      const request = handler.createRequest('test.method', { param: 'value' });

      expect(request).toHaveProperty('jsonrpc', JSON_RPC_VERSION);
      expect(request).toHaveProperty('id');
      expect(request).toHaveProperty('method', 'test.method');
      expect(request).toHaveProperty('params', { param: 'value' });
      expect(typeof request.id).toBe('number');
    });

    it('should create request without params', () => {
      const request = handler.createRequest('test.method');

      expect(request).toHaveProperty('jsonrpc', JSON_RPC_VERSION);
      expect(request).toHaveProperty('id');
      expect(request).toHaveProperty('method', 'test.method');
      expect(request.params).toBeUndefined();
    });

    it('should generate unique request IDs', () => {
      const request1 = handler.createRequest('method1');
      const request2 = handler.createRequest('method2');

      expect(request1.id).not.toBe(request2.id);
    });
  });

  describe('Notification Creation', () => {
    it('should create valid JSON-RPC notification', () => {
      const notification = handler.createNotification('test.notify', { data: 'test' });

      expect(notification).toHaveProperty('jsonrpc', JSON_RPC_VERSION);
      expect(notification).toHaveProperty('method', 'test.notify');
      expect(notification).toHaveProperty('params', { data: 'test' });
      expect(notification).not.toHaveProperty('id');
    });

    it('should create notification without params', () => {
      const notification = handler.createNotification('test.notify');

      expect(notification).toHaveProperty('jsonrpc', JSON_RPC_VERSION);
      expect(notification).toHaveProperty('method', 'test.notify');
      expect(notification.params).toBeUndefined();
      expect(notification).not.toHaveProperty('id');
    });
  });

  describe('Response Creation', () => {
    it('should create success response', () => {
      const response = handler.createResponse(1, { result: 'success' });

      expect(response).toHaveProperty('jsonrpc', JSON_RPC_VERSION);
      expect(response).toHaveProperty('id', 1);
      expect(response).toHaveProperty('result', { result: 'success' });
      expect(response).not.toHaveProperty('error');
    });

    it('should create error response', () => {
      const error = new MCPError(
        MCPErrorCode.INVALID_PARAMS,
        'Invalid parameters'
      );

      const response = handler.createErrorResponse(1, error);

      expect(response).toHaveProperty('jsonrpc', JSON_RPC_VERSION);
      expect(response).toHaveProperty('id', 1);
      expect(response).toHaveProperty('error');
      expect(response.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(response.error?.message).toBe('Invalid parameters');
      expect(response).not.toHaveProperty('result');
    });

    it('should create response with null result', () => {
      const response = handler.createResponse(1);

      expect(response).toHaveProperty('result', null);
    });
  });

  describe('Request Handling', () => {
    it('should send request and handle response', async () => {
      const sendMock = jest.fn().mockResolvedValue(undefined);

      const promise = handler.sendRequest(
        'test.method',
        { param: 'value' },
        sendMock
      );

      // 验证请求已发送
      expect(sendMock).toHaveBeenCalled();
      const sentRequest = sendMock.mock.calls[0][0];
      expect(sentRequest.method).toBe('test.method');

      // 模拟响应
      const response = {
        jsonrpc: JSON_RPC_VERSION,
        id: sentRequest.id,
        result: { success: true },
      };

      handler.handleMessage(response);

      // 验证Promise解决
      const result = await promise;
      expect(result).toEqual({ success: true });
    });

    it('should handle error response', async () => {
      const sendMock = jest.fn().mockResolvedValue(undefined);

      const promise = handler.sendRequest(
        'test.method',
        {},
        sendMock
      );

      const sentRequest = sendMock.mock.calls[0][0];

      // 模拟错误响应
      const errorResponse = {
        jsonrpc: JSON_RPC_VERSION,
        id: sentRequest.id,
        error: {
          code: MCPErrorCode.METHOD_NOT_FOUND,
          message: 'Method not found',
        },
      };

      handler.handleMessage(errorResponse);

      // 验证Promise被拒绝
      await expect(promise).rejects.toThrow(MCPError);
      await expect(promise).rejects.toThrow('Method not found');
    });

    it('should handle request timeout', async () => {
      const sendMock = jest.fn().mockResolvedValue(undefined);

      const promise = handler.sendRequest(
        'test.method',
        {},
        sendMock
      );

      // 等待超时
      await expect(promise).rejects.toThrow(MCPError);
      await expect(promise).rejects.toThrow('Request timeout');
    }, 2000);

    it('should handle send failure', async () => {
      const sendMock = jest.fn().mockRejectedValue(new Error('Send failed'));

      await expect(
        handler.sendRequest('test.method', {}, sendMock)
      ).rejects.toThrow('Send failed');

      // 验证待处理请求已清理
      expect(handler.getPendingRequestCount()).toBe(0);
    });
  });

  describe('Notification Handling', () => {
    it('should send notification without waiting', async () => {
      const sendMock = jest.fn().mockResolvedValue(undefined);

      await handler.sendNotification(
        'test.notify',
        { data: 'test' },
        sendMock
      );

      expect(sendMock).toHaveBeenCalled();
      const sentNotification = sendMock.mock.calls[0][0];
      expect(sentNotification.method).toBe('test.notify');
      expect(sentNotification).not.toHaveProperty('id');
    });
  });

  describe('Message Processing', () => {
    it('should handle incoming request', (done) => {
      handler.on('request', (request: any) => {
        expect(request.method).toBe('server.request');
        expect(request.params).toEqual({ test: true });
        done();
      });

      const incomingRequest = {
        jsonrpc: JSON_RPC_VERSION,
        id: 100,
        method: 'server.request',
        params: { test: true },
      };

      handler.handleMessage(incomingRequest);
    });

    it('should handle incoming notification', (done) => {
      handler.on('notification', (notification: any) => {
        expect(notification.method).toBe('server.notify');
        done();
      });

      const incomingNotification = {
        jsonrpc: JSON_RPC_VERSION,
        method: 'server.notify',
        params: {},
      };

      handler.handleMessage(incomingNotification);
    });

    it('should ignore invalid messages', (done) => {
      handler.on('error', (error: any) => {
        expect(error).toBeInstanceOf(MCPError);
        done();
      });

      // 无效的消息（没有jsonrpc字段）
      handler.handleMessage({ method: 'test' });
    });

    it('should ignore response without pending request', () => {
      const response = {
        jsonrpc: JSON_RPC_VERSION,
        id: 999,
        result: { data: 'test' },
      };

      // 不应该抛出错误，只是警告
      expect(() => handler.handleMessage(response)).not.toThrow();
    });
  });

  describe('Pending Request Management', () => {
    it('should track pending requests', async () => {
      const sendMock = jest.fn().mockResolvedValue(undefined);

      handler.sendRequest('method1', {}, sendMock);
      handler.sendRequest('method2', {}, sendMock);

      expect(handler.getPendingRequestCount()).toBe(2);

      const pendingRequests = handler.getPendingRequests();
      expect(pendingRequests).toHaveLength(2);
      expect(pendingRequests[0].method).toBe('method1');
      expect(pendingRequests[1].method).toBe('method2');
    });

    it('should clear pending requests', async () => {
      const sendMock = jest.fn().mockResolvedValue(undefined);

      const promise1 = handler.sendRequest('method1', {}, sendMock);
      const promise2 = handler.sendRequest('method2', {}, sendMock);

      expect(handler.getPendingRequestCount()).toBe(2);

      handler.clearPendingRequests();

      expect(handler.getPendingRequestCount()).toBe(0);

      // 验证所有Promise都被拒绝
      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
    });

    it('should clear pending requests with custom error', async () => {
      const sendMock = jest.fn().mockResolvedValue(undefined);

      const promise = handler.sendRequest('method', {}, sendMock);

      const customError = new MCPError(
        MCPErrorCode.CONNECTION_ERROR,
        'Connection lost'
      );

      handler.clearPendingRequests(customError);

      await expect(promise).rejects.toThrow('Connection lost');
    });
  });
});