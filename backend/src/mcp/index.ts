/**
 * MCP (Model Context Protocol) 模块入口
 * 导出所有MCP相关功能
 */

// 导出主要类
export { MCPClient } from './client';
export type { MCPClientOptions } from './client';
export { ConfigLoader } from './config-loader';
export { MessageHandler } from './message-handler';
export { StdioTransport } from './transports/stdio.transport';

// 导出类型定义
export {
  // 基础类型
  JsonRpcId,
  JSON_RPC_VERSION,
  MCPTool,
  MCPResource,
  MCPPrompt,
  QueryContext,
  QueryResult,
  TransactionResult,
  ConnectionMetrics,

  // JSON-RPC类型
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcNotification,

  // MCP协议类型
  InitializeParams,
  InitializeResult,
  ClientCapabilities,
  ServerCapabilities,
  ToolCallRequest,
  ToolCallResponse,

  // Transport类型
  Transport,

  // 配置类型
  ServerConfig,
  MCPConfig,

  // 错误类型
  MCPError,
  MCPErrorCode,

  // 处理器类型
  ErrorHandler,
  MessageHandler as MessageHandlerType,
  ConnectionStateHandler,
} from './types';

// 导出工具函数
export { Logger } from '../utils/logger';

/**
 * 创建MCP Client实例的工厂函数
 */
import { MCPClient, MCPClientOptions } from './client';

export async function createMCPClient(options?: MCPClientOptions): Promise<MCPClient> {
  const client = new MCPClient(options);

  if (options?.autoConnect !== false) {
    await client.connect();
  }

  return client;
}

/**
 * MCP Client单例管理器
 */
class MCPClientManager {
  private static instance: MCPClient | null = null;

  /**
   * 获取单例实例
   */
  static async getInstance(options?: MCPClientOptions): Promise<MCPClient> {
    if (!this.instance) {
      this.instance = await createMCPClient(options);
    }
    return this.instance;
  }

  /**
   * 重置单例实例
   */
  static async reset(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
    }
  }
}

export { MCPClientManager };

// 导出默认实例创建函数
export default createMCPClient;