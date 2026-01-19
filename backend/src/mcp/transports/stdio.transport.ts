/**
 * STDIO Transport 实现
 * 通过标准输入输出与MCP服务器通信
 */

import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as readline from 'readline';
import { Transport, ServerConfig, MCPError, MCPErrorCode } from '../types';
import { Logger } from '../../utils/logger';

/**
 * STDIO Transport实现类
 * 使用子进程的标准输入输出进行通信
 */
export class StdioTransport extends EventEmitter implements Transport {
  private process: ChildProcess | null = null;
  private reader: readline.Interface | null = null;
  private connected: boolean = false;
  private messageQueue: any[] = [];
  private logger: Logger;

  constructor(
    private config: ServerConfig,
    logger?: Logger
  ) {
    super();
    this.logger = logger || new Logger('StdioTransport');
  }

  /**
   * 启动子进程并建立连接
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.logger.warn('Already connected');
      return;
    }

    try {
      // 准备环境变量
      const env = {
        ...process.env,
        ...this.config.env,
      };

      // 启动子进程
      this.process = spawn(this.config.command, this.config.args || [], {
        cwd: this.config.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 错误处理
      this.process.on('error', (error) => {
        this.logger.error('Process error:', error);
        this.handleError(new MCPError(
          MCPErrorCode.CONNECTION_ERROR,
          `Failed to start process: ${error.message}`
        ));
      });

      // 进程退出处理
      this.process.on('exit', (code, signal) => {
        this.logger.info(`Process exited with code ${code}, signal ${signal}`);
        this.connected = false;
        this.emit('disconnect', { code, signal });
      });

      // 标准错误输出处理
      this.process.stderr?.on('data', (data) => {
        this.logger.error('Process stderr:', data.toString());
      });

      // 创建readline接口读取标准输出
      this.reader = readline.createInterface({
        input: this.process.stdout!,
        crlfDelay: Infinity,
      });

      // 监听消息
      this.reader.on('line', (line) => {
        this.handleMessage(line);
      });

      this.connected = true;
      this.logger.info('Connected to MCP server');
      this.emit('connect');

      // 如果配置了超时，设置超时检查
      if (this.config.timeout) {
        this.setupTimeout();
      }
    } catch (error) {
      throw new MCPError(
        MCPErrorCode.CONNECTION_ERROR,
        `Failed to connect: ${error}`
      );
    }
  }

  /**
   * 发送消息到MCP服务器
   */
  async send(message: any): Promise<void> {
    if (!this.connected || !this.process?.stdin) {
      throw new MCPError(
        MCPErrorCode.CONNECTION_ERROR,
        'Not connected to MCP server'
      );
    }

    try {
      const jsonMessage = JSON.stringify(message);
      this.logger.debug('Sending message:', jsonMessage);

      // 写入消息到标准输入，每条消息一行
      await new Promise<void>((resolve, reject) => {
        this.process!.stdin!.write(jsonMessage + '\n', (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        `Failed to send message: ${error}`
      );
    }
  }

  /**
   * 接收消息（从队列中获取）
   */
  async receive(): Promise<any> {
    if (!this.connected) {
      throw new MCPError(
        MCPErrorCode.CONNECTION_ERROR,
        'Not connected to MCP server'
      );
    }

    // 如果队列中有消息，直接返回
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift();
    }

    // 等待新消息
    return new Promise((resolve, reject) => {
      const timeout = this.config.timeout || 30000; // 默认30秒超时

      const timer = setTimeout(() => {
        reject(new MCPError(
          MCPErrorCode.TIMEOUT_ERROR,
          'Timeout waiting for message'
        ));
      }, timeout);

      // 监听消息事件
      const messageHandler = (message: any) => {
        clearTimeout(timer);
        this.off('message', messageHandler);
        resolve(message);
      };

      // 监听错误事件
      const errorHandler = (error: MCPError) => {
        clearTimeout(timer);
        this.off('error', errorHandler);
        this.off('message', messageHandler);
        reject(error);
      };

      this.once('message', messageHandler);
      this.once('error', errorHandler);
    });
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.logger.info('Closing connection');

    if (this.reader) {
      this.reader.close();
      this.reader = null;
    }

    if (this.process) {
      if (!this.process.killed) {
        // 先尝试优雅关闭
        this.process.kill('SIGTERM');

        // 设置强制关闭定时器
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.logger.warn('Force killing process');
            this.process.kill('SIGKILL');
          }
        }, 5000);
      }
      this.process = null;
    }

    this.connected = false;
    this.messageQueue = [];
    this.emit('disconnect');
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected && !this.process?.killed;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(line: string): void {
    try {
      // 忽略空行
      if (!line.trim()) {
        return;
      }

      // 解析JSON消息
      const message = JSON.parse(line);
      this.logger.debug('Received message:', message);

      // 添加到消息队列
      this.messageQueue.push(message);

      // 触发消息事件
      this.emit('message', message);
    } catch (error) {
      this.logger.error('Failed to parse message:', line, error);
      this.handleError(new MCPError(
        MCPErrorCode.PARSE_ERROR,
        `Invalid JSON message: ${line}`
      ));
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: MCPError): void {
    this.logger.error('Transport error:', error);
    this.emit('error', error);
  }

  /**
   * 设置超时检查
   */
  private setupTimeout(): void {
    if (!this.config.timeout) {
      return;
    }

    let lastActivity = Date.now();

    // 更新活动时间
    const updateActivity = () => {
      lastActivity = Date.now();
    };

    this.on('message', updateActivity);
    this.on('send', updateActivity);

    // 定期检查超时
    const checkInterval = setInterval(() => {
      if (!this.connected) {
        clearInterval(checkInterval);
        return;
      }

      const now = Date.now();
      if (now - lastActivity > this.config.timeout!) {
        this.logger.warn('Connection timeout');
        this.handleError(new MCPError(
          MCPErrorCode.TIMEOUT_ERROR,
          'Connection timeout due to inactivity'
        ));
        this.close();
        clearInterval(checkInterval);
      }
    }, 5000); // 每5秒检查一次
  }

  /**
   * 获取进程信息（用于调试）
   */
  getProcessInfo(): any {
    if (!this.process) {
      return null;
    }

    return {
      pid: this.process.pid,
      connected: this.connected,
      killed: this.process.killed,
      queueLength: this.messageQueue.length,
    };
  }
}