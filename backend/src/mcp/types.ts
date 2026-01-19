/**
 * MCP (Model Context Protocol) 类型定义
 * 严格遵循MCP官方协议规范
 */

import { z } from 'zod';

// ====== 基础类型定义 ======

/**
 * JSON-RPC 2.0 消息ID类型
 */
export type JsonRpcId = string | number | null;

/**
 * JSON-RPC 2.0 版本
 */
export const JSON_RPC_VERSION = '2.0';

/**
 * MCP工具定义
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
  permissions?: string[];
}

/**
 * MCP资源定义
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP提示定义
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * 查询上下文
 */
export interface QueryContext {
  userId: string;
  role: string;
  database?: string;
  timeout?: number;
  readOnly?: boolean;
}

/**
 * 查询结果
 */
export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    rowsAffected?: number;
    executionTime?: number;
    sql?: string;
  };
}

/**
 * 连接指标
 */
export interface ConnectionMetrics {
  connected: boolean;
  uptime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
}

// ====== JSON-RPC 2.0 消息类型 ======

/**
 * JSON-RPC 2.0 请求
 */
export interface JsonRpcRequest {
  jsonrpc: typeof JSON_RPC_VERSION;
  id: JsonRpcId;
  method: string;
  params?: any;
}

/**
 * JSON-RPC 2.0 响应
 */
export interface JsonRpcResponse {
  jsonrpc: typeof JSON_RPC_VERSION;
  id: JsonRpcId;
  result?: any;
  error?: JsonRpcError;
}

/**
 * JSON-RPC 2.0 错误
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

/**
 * JSON-RPC 2.0 通知
 */
export interface JsonRpcNotification {
  jsonrpc: typeof JSON_RPC_VERSION;
  method: string;
  params?: any;
}

// ====== MCP协议消息类型 ======

/**
 * 初始化请求参数
 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * 初始化结果
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * 客户端能力
 */
export interface ClientCapabilities {
  tools?: {
    call?: boolean;
  };
  resources?: {
    read?: boolean;
    write?: boolean;
  };
  prompts?: {
    list?: boolean;
  };
}

/**
 * 服务器能力
 */
export interface ServerCapabilities {
  tools?: {
    list?: boolean;
  };
  resources?: {
    list?: boolean;
    read?: boolean;
  };
  prompts?: {
    list?: boolean;
  };
}

/**
 * 工具调用请求
 */
export interface ToolCallRequest {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * 工具调用响应
 */
export interface ToolCallResponse {
  content: Array<{
    type: string;
    text?: string;
    data?: any;
  }>;
}

// ====== Transport层接口 ======

/**
 * Transport层接口 - 处理消息传输
 */
export interface Transport {
  /**
   * 发送消息
   */
  send(message: any): Promise<void>;

  /**
   * 接收消息
   */
  receive(): Promise<any>;

  /**
   * 关闭连接
   */
  close(): void;

  /**
   * 是否已连接
   */
  isConnected(): boolean;
}

// ====== MCP配置类型 ======

/**
 * MCP服务器配置
 */
export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
}

/**
 * MCP配置
 */
export interface MCPConfig {
  mcpServers: Record<string, ServerConfig>;
  defaultServer?: string;
  connectionRetry?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier?: number;
  };
}

// ====== 事务相关类型 ======

/**
 * 事务结果
 */
export interface TransactionResult {
  success: boolean;
  results: QueryResult[];
  error?: string;
}

// ====== 错误类型 ======

/**
 * MCP错误代码
 */
export enum MCPErrorCode {
  // JSON-RPC 2.0 标准错误码
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // MCP自定义错误码
  CONNECTION_ERROR = -32001,
  TIMEOUT_ERROR = -32002,
  AUTHENTICATION_ERROR = -32003,
  PERMISSION_ERROR = -32004,
  RESOURCE_NOT_FOUND = -32005,
}

/**
 * MCP错误类
 */
export class MCPError extends Error {
  constructor(
    public code: MCPErrorCode,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }

  toJsonRpcError(): JsonRpcError {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

// ====== Zod Schema验证 ======

/**
 * 服务器配置验证Schema
 */
export const ServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  timeout: z.number().optional(),
});

/**
 * MCP配置验证Schema
 */
export const MCPConfigSchema = z.object({
  mcpServers: z.record(ServerConfigSchema),
  defaultServer: z.string().optional(),
  connectionRetry: z.object({
    maxRetries: z.number(),
    retryDelay: z.number(),
    backoffMultiplier: z.number().optional(),
  }).optional(),
});

// ====== 工具函数类型 ======

/**
 * 错误处理函数
 */
export type ErrorHandler = (error: MCPError) => void;

/**
 * 消息处理函数
 */
export type MessageHandler = (message: any) => void;

/**
 * 连接状态变化处理函数
 */
export type ConnectionStateHandler = (connected: boolean) => void;