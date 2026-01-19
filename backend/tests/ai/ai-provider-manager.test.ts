/**
 * AI Provider Manager单元测试
 */

import { AIProviderManager, LoadBalanceStrategy } from '../../src/ai/ai-provider-manager';
import { AIProviderType, ChatRequest, MessageRole } from '../../src/ai/types';

describe('AIProviderManager', () => {
  let manager: AIProviderManager;

  beforeEach(() => {
    manager = new AIProviderManager({
      enableFailover: true,
      healthCheckInterval: 0 // 禁用自动健康检查
    });
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('Initialization', () => {
    it('should initialize manager', async () => {
      await manager.initialize();
      expect(manager).toBeDefined();
    });

    it('should load providers from environment variables', async () => {
      if (process.env.DEEPSEEK_API_KEY) {
        await manager.initialize();
        const providers = manager.getAvailableProviders();
        expect(providers).toContain(AIProviderType.DEEPSEEK);
      }
    });

    it('should set default provider', async () => {
      if (process.env.DEEPSEEK_API_KEY) {
        const customManager = new AIProviderManager({
          defaultProvider: AIProviderType.DEEPSEEK,
          healthCheckInterval: 0
        });
        await customManager.initialize();

        const provider = customManager.getActiveProvider();
        expect(provider).toBeDefined();
        expect(provider.name).toBe('deepseek');

        await customManager.dispose();
      }
    });
  });

  describe('Provider Registration', () => {
    it('should register a provider manually', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiBase: process.env.DEEPSEEK_API_BASE
      });

      const providers = manager.getAvailableProviders();
      expect(providers).toContain(AIProviderType.DEEPSEEK);
    });

    it('should throw error for invalid API key', async () => {
      await expect(manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: 'invalid-key'
      })).rejects.toThrow();
    });

    it('should remove provider', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      manager.removeProvider(AIProviderType.DEEPSEEK);
      const providers = manager.getAvailableProviders();
      expect(providers).not.toContain(AIProviderType.DEEPSEEK);
    });
  });

  describe('Active Provider Management', () => {
    beforeEach(async () => {
      if (process.env.DEEPSEEK_API_KEY) {
        await manager.registerProvider(AIProviderType.DEEPSEEK, {
          apiKey: process.env.DEEPSEEK_API_KEY
        });
      }
    });

    it('should set and get active provider', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      manager.setActiveProvider(AIProviderType.DEEPSEEK);
      const provider = manager.getActiveProvider();
      expect(provider).toBeDefined();
      expect(provider.name).toBe('deepseek');
    });

    it('should throw error when setting non-existent provider', () => {
      expect(() => {
        manager.setActiveProvider(AIProviderType.GEMINI);
      }).toThrow('Provider gemini not registered');
    });

    it('should throw error when no active provider', () => {
      const emptyManager = new AIProviderManager();
      expect(() => {
        emptyManager.getActiveProvider();
      }).toThrow('No active provider set');
    });
  });

  describe('Chat Functionality', () => {
    beforeEach(async () => {
      if (process.env.DEEPSEEK_API_KEY) {
        await manager.registerProvider(AIProviderType.DEEPSEEK, {
          apiKey: process.env.DEEPSEEK_API_KEY
        });
        manager.setActiveProvider(AIProviderType.DEEPSEEK);
      }
    });

    it('should perform chat through manager', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      const request: ChatRequest = {
        messages: [
          {
            role: MessageRole.USER,
            content: '你好'
          }
        ],
        maxTokens: 50
      };

      const response = await manager.chat(request);
      expect(response).toBeDefined();
      expect(response.message.content).toBeTruthy();
      expect(response.provider).toBe(AIProviderType.DEEPSEEK);
    });

    it('should handle stream chat', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      const request: ChatRequest = {
        messages: [
          {
            role: MessageRole.USER,
            content: '数到5'
          }
        ],
        stream: true,
        maxTokens: 50
      };

      const chunks: string[] = [];
      for await (const response of manager.streamChat(request)) {
        if (response.delta?.content) {
          chunks.push(response.delta.content);
        }
        if (response.done) {
          break;
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join('');
      expect(fullResponse).toBeTruthy();
    });
  });

  describe('Load Balancing', () => {
    it('should support round robin strategy', async () => {
      const customManager = new AIProviderManager({
        loadBalanceStrategy: LoadBalanceStrategy.ROUND_ROBIN,
        healthCheckInterval: 0
      });

      // 这里只是测试策略配置，实际需要多个Provider才能测试负载均衡
      await customManager.initialize();
      expect(customManager).toBeDefined();
      await customManager.dispose();
    });

    it('should support random strategy', async () => {
      const customManager = new AIProviderManager({
        loadBalanceStrategy: LoadBalanceStrategy.RANDOM,
        healthCheckInterval: 0
      });

      await customManager.initialize();
      expect(customManager).toBeDefined();
      await customManager.dispose();
    });
  });

  describe('Failover', () => {
    it('should handle failover when provider fails', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      // 注册一个会失败的Provider（使用错误的API key）
      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: 'invalid-key-that-will-fail'
      });

      manager.setActiveProvider(AIProviderType.DEEPSEEK);

      const request: ChatRequest = {
        messages: [
          {
            role: MessageRole.USER,
            content: 'test'
          }
        ]
      };

      // 期望failover机制能处理失败
      await expect(manager.chat(request)).rejects.toThrow();
    });
  });

  describe('Provider Status', () => {
    it('should get all provider status', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      const status = manager.getAllProviderStatus();
      expect(status).toBeDefined();
      expect(status.has(AIProviderType.DEEPSEEK)).toBe(true);

      const deepseekStatus = status.get(AIProviderType.DEEPSEEK);
      expect(deepseekStatus).toBeDefined();
      expect(deepseekStatus?.isActive).toBe(true);
      expect(deepseekStatus?.isHealthy).toBe(true);
      expect(deepseekStatus?.activeConnections).toBe(0);
    });

    it('should get available providers list', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      const providers = manager.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain(AIProviderType.DEEPSEEK);
    });
  });

  describe('Events', () => {
    it('should emit events on provider registration', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      let eventFired = false;
      manager.on('providerRegistered', (type) => {
        eventFired = true;
        expect(type).toBe(AIProviderType.DEEPSEEK);
      });

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      expect(eventFired).toBe(true);
    });

    it('should emit events on provider removal', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      let eventFired = false;
      manager.on('providerRemoved', (type) => {
        eventFired = true;
        expect(type).toBe(AIProviderType.DEEPSEEK);
      });

      manager.removeProvider(AIProviderType.DEEPSEEK);
      expect(eventFired).toBe(true);
    });

    it('should emit events on active provider change', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      let eventFired = false;
      manager.on('activeProviderChanged', (type) => {
        eventFired = true;
        expect(type).toBe(AIProviderType.DEEPSEEK);
      });

      manager.setActiveProvider(AIProviderType.DEEPSEEK);
      expect(eventFired).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not set');
        return;
      }

      await manager.registerProvider(AIProviderType.DEEPSEEK, {
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      await manager.dispose();
      const providers = manager.getAvailableProviders();
      expect(providers.length).toBe(0);
    });
  });
});