/**
 * MCP配置加载器
 * 负责加载和解析mcp.json配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { MCPConfig, ServerConfig, MCPConfigSchema, MCPError, MCPErrorCode } from './types';
import { Logger } from '../utils/logger';

/**
 * 配置加载器类
 */
export class ConfigLoader {
  private config: MCPConfig | null = null;
  private configPath: string;
  private logger: Logger;

  constructor(configPath?: string, logger?: Logger) {
    this.configPath = configPath || path.join(process.cwd(), 'mcp.json');
    this.logger = logger || new Logger('ConfigLoader');
  }

  /**
   * 加载配置文件
   */
  async loadConfig(): Promise<MCPConfig> {
    try {
      this.logger.info(`Loading MCP configuration from: ${this.configPath}`);

      // 检查配置文件是否存在
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      // 读取配置文件
      const configContent = fs.readFileSync(this.configPath, 'utf-8');

      // 解析JSON
      let configData = JSON.parse(configContent);

      // 处理环境变量替换
      configData = this.processEnvironmentVariables(configData);

      // 验证配置格式
      const result = MCPConfigSchema.safeParse(configData);

      if (!result.success) {
        throw new Error(`Invalid configuration: ${result.error.message}`);
      }

      this.config = result.data;
      this.logger.info('MCP configuration loaded successfully');

      return this.config;
    } catch (error) {
      this.logger.error('Failed to load configuration:', error);
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        `Failed to load MCP configuration: ${error}`
      );
    }
  }

  /**
   * 获取服务器配置
   */
  getServerConfig(serverName?: string): ServerConfig {
    if (!this.config) {
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        'Configuration not loaded'
      );
    }

    const name = serverName || this.config.defaultServer;

    if (!name) {
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        'No server name specified and no default server configured'
      );
    }

    const serverConfig = this.config.mcpServers[name];

    if (!serverConfig) {
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        `Server configuration not found: ${name}`
      );
    }

    return serverConfig;
  }

  /**
   * 获取所有服务器名称
   */
  getServerNames(): string[] {
    if (!this.config) {
      return [];
    }

    return Object.keys(this.config.mcpServers);
  }

  /**
   * 获取默认服务器名称
   */
  getDefaultServerName(): string | undefined {
    return this.config?.defaultServer;
  }

  /**
   * 获取重试配置
   */
  getRetryConfig(): MCPConfig['connectionRetry'] {
    return this.config?.connectionRetry || {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    };
  }

  /**
   * 处理环境变量替换
   * 支持 ${VAR_NAME} 和 ${VAR_NAME:-default_value} 格式
   */
  private processEnvironmentVariables(obj: any): any {
    if (typeof obj === 'string') {
      // 替换环境变量
      return obj.replace(/\$\{([^}]+)\}/g, (match, varExpression) => {
        // 支持默认值语法: ${VAR_NAME:-default_value}
        const [varName, defaultValue] = varExpression.split(':-');
        const envValue = process.env[varName.trim()];

        if (envValue !== undefined) {
          return envValue;
        }

        if (defaultValue !== undefined) {
          return defaultValue.trim();
        }

        // 如果没有默认值且环境变量不存在，保持原样
        this.logger.warn(`Environment variable not found: ${varName}`);
        return match;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processEnvironmentVariables(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processEnvironmentVariables(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<MCPConfig> {
    this.logger.info('Reloading MCP configuration');
    this.config = null;
    return this.loadConfig();
  }

  /**
   * 监视配置文件变化
   */
  watchConfig(callback: (config: MCPConfig) => void): fs.FSWatcher {
    this.logger.info('Starting configuration file watcher');

    return fs.watch(this.configPath, async (eventType) => {
      if (eventType === 'change') {
        this.logger.info('Configuration file changed, reloading...');
        try {
          const config = await this.reloadConfig();
          callback(config);
        } catch (error) {
          this.logger.error('Failed to reload configuration:', error);
        }
      }
    });
  }

  /**
   * 验证服务器配置
   */
  validateServerConfig(serverName: string): boolean {
    try {
      const config = this.getServerConfig(serverName);

      // 检查命令是否存在
      if (!config.command) {
        this.logger.error(`Invalid server config: missing command for ${serverName}`);
        return false;
      }

      // 检查环境变量中的必需值
      if (config.env) {
        for (const [_key, value] of Object.entries(config.env)) {
          if (typeof value === 'string' && value.includes('${') && !value.includes(':-')) {
            // 检查是否有未设置的必需环境变量
            const varName = value.match(/\$\{([^}:]+)\}/)?.[1];
            if (varName && !process.env[varName]) {
              this.logger.warn(`Missing required environment variable: ${varName} for server ${serverName}`);
            }
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Invalid server configuration for ${serverName}:`, error);
      return false;
    }
  }

  /**
   * 导出配置（用于调试）
   */
  exportConfig(): MCPConfig | null {
    return this.config;
  }

  /**
   * 创建默认配置文件
   */
  static createDefaultConfig(filePath: string): void {
    const defaultConfig: MCPConfig = {
      mcpServers: {
        'mysql-mcp': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-mysql'],
          env: {
            MYSQL_HOST: '${MYSQL_HOST:-localhost}',
            MYSQL_PORT: '${MYSQL_PORT:-3306}',
            MYSQL_USER: '${MYSQL_USER:-root}',
            MYSQL_PASSWORD: '${MYSQL_PASSWORD}',
            MYSQL_DATABASE: '${MYSQL_DATABASE:-ailiaox}',
          },
          timeout: 30000,
        },
      },
      defaultServer: 'mysql-mcp',
      connectionRetry: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2));
  }
}