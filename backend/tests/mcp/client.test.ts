/**
 * MCP Client 单元测试
 */

import { MCPClient } from '../../src/mcp/client';
import { ConfigLoader } from '../../src/mcp/config-loader';
import { MCPError, MCPErrorCode } from '../../src/mcp/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock数据
const mockConfig = {
  mcpServers: {
    'test-server': {
      command: 'echo',
      args: ['test'],
      env: {
        TEST_VAR: 'test_value',
      },
      timeout: 5000,
    },
  },
  defaultServer: 'test-server',
  connectionRetry: {
    maxRetries: 2,
    retryDelay: 100,
    backoffMultiplier: 2,
  },
};

describe('MCPClient', () => {
  let client: MCPClient;
  let configPath: string;

  beforeAll(() => {
    // 创建临时配置文件
    configPath = path.join(__dirname, 'test-mcp.json');
    fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));
  });

  afterAll(() => {
    // 清理临时配置文件
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  beforeEach(() => {
    client = new MCPClient({
      configPath,
      autoConnect: false,
    });
  });

  afterEach(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  describe('Configuration', () => {
    it('should load configuration from file', async () => {
      const loader = new ConfigLoader(configPath);
      const config = await loader.loadConfig();

      expect(config).toBeDefined();
      expect(config.mcpServers['test-server']).toBeDefined();
      expect(config.defaultServer).toBe('test-server');
    });

    it('should get server configuration', async () => {
      const loader = new ConfigLoader(configPath);
      await loader.loadConfig();

      const serverConfig = loader.getServerConfig('test-server');

      expect(serverConfig).toBeDefined();
      expect(serverConfig.command).toBe('echo');
      expect(serverConfig.args).toEqual(['test']);
    });

    it('should handle environment variable substitution', async () => {
      const configWithEnv = {
        ...mockConfig,
        mcpServers: {
          'env-test': {
            command: 'test',
            env: {
              VAR1: '${TEST_ENV_VAR:-default_value}',
              VAR2: '${EXISTING_VAR}',
            },
          },
        },
      };

      const envConfigPath = path.join(__dirname, 'test-env-mcp.json');
      fs.writeFileSync(envConfigPath, JSON.stringify(configWithEnv, null, 2));

      process.env.EXISTING_VAR = 'existing_value';

      const loader = new ConfigLoader(envConfigPath);
      await loader.loadConfig();

      const serverConfig = loader.getServerConfig('env-test');

      expect(serverConfig.env?.VAR1).toBe('default_value');
      expect(serverConfig.env?.VAR2).toBe('existing_value');

      // 清理
      fs.unlinkSync(envConfigPath);
      delete process.env.EXISTING_VAR;
    });

    it('should validate server configuration', async () => {
      const loader = new ConfigLoader(configPath);
      await loader.loadConfig();

      const isValid = loader.validateServerConfig('test-server');
      expect(isValid).toBe(true);

      // 测试无效配置
      const invalidValid = loader.validateServerConfig('non-existent');
      expect(invalidValid).toBe(false);
    });
  });

  describe('Connection Management', () => {
    it('should check connection status', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await expect(client.disconnect()).resolves.not.toThrow();
    });

    it('should get current server name', () => {
      expect(client.getCurrentServerName()).toBeNull();
    });

    it('should get server capabilities', () => {
      expect(client.getServerCapabilities()).toBeNull();
    });

    it('should throw error when calling methods without connection', async () => {
      await expect(client.listTools()).rejects.toThrow(MCPError);
      await expect(client.executeQuery('SELECT 1')).rejects.toThrow();
    });
  });

  describe('Metrics', () => {
    it('should return initial metrics', () => {
      const metrics = client.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.connected).toBe(false);
      expect(metrics.uptime).toBe(0);
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle error events', (done) => {
      client.onError((error: MCPError) => {
        expect(error).toBeInstanceOf(MCPError);
        done();
      });

      client.emit('error', new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        'Test error'
      ));
    });

    it('should handle connection state changes', (done) => {
      let callCount = 0;

      client.onConnectionStateChange((connected: boolean) => {
        callCount++;
        if (callCount === 1) {
          expect(connected).toBe(true);
        } else if (callCount === 2) {
          expect(connected).toBe(false);
          done();
        }
      });

      client.emit('connected');
      client.emit('disconnected');
    });
  });
});

describe('ConfigLoader', () => {
  let configPath: string;

  beforeEach(() => {
    configPath = path.join(__dirname, 'test-config-loader.json');
  });

  afterEach(() => {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  it('should create default configuration', () => {
    ConfigLoader.createDefaultConfig(configPath);

    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    expect(config.mcpServers).toBeDefined();
    expect(config.defaultServer).toBe('mysql-mcp');
    expect(config.connectionRetry).toBeDefined();
  });

  it('should handle missing configuration file', async () => {
    const loader = new ConfigLoader('/non/existent/path.json');

    await expect(loader.loadConfig()).rejects.toThrow(MCPError);
  });

  it('should get server names', async () => {
    fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

    const loader = new ConfigLoader(configPath);
    await loader.loadConfig();

    const names = loader.getServerNames();
    expect(names).toContain('test-server');
  });

  it('should get default server name', async () => {
    fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

    const loader = new ConfigLoader(configPath);
    await loader.loadConfig();

    const defaultName = loader.getDefaultServerName();
    expect(defaultName).toBe('test-server');
  });

  it('should get retry configuration', async () => {
    fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

    const loader = new ConfigLoader(configPath);
    await loader.loadConfig();

    const retryConfig = loader.getRetryConfig();
    expect(retryConfig).toBeDefined();
    expect(retryConfig!.maxRetries).toBe(2);
    expect(retryConfig!.retryDelay).toBe(100);
    expect(retryConfig!.backoffMultiplier).toBe(2);
  });

  it('should export configuration', async () => {
    fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

    const loader = new ConfigLoader(configPath);
    await loader.loadConfig();

    const exported = loader.exportConfig();
    expect(exported).toEqual(mockConfig);
  });
});

describe('MCPError', () => {
  it('should create error with code and message', () => {
    const error = new MCPError(
      MCPErrorCode.CONNECTION_ERROR,
      'Connection failed'
    );

    expect(error.code).toBe(MCPErrorCode.CONNECTION_ERROR);
    expect(error.message).toBe('Connection failed');
    expect(error.name).toBe('MCPError');
  });

  it('should convert to JSON-RPC error', () => {
    const error = new MCPError(
      MCPErrorCode.INVALID_PARAMS,
      'Invalid parameters',
      { field: 'test' }
    );

    const jsonRpcError = error.toJsonRpcError();

    expect(jsonRpcError.code).toBe(MCPErrorCode.INVALID_PARAMS);
    expect(jsonRpcError.message).toBe('Invalid parameters');
    expect(jsonRpcError.data).toEqual({ field: 'test' });
  });
});