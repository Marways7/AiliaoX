import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { AIProviderManager } from '../ai/ai-provider-manager';

const router = Router();
const aiManager = new AIProviderManager();

// 初始化AI Manager
let isInitialized = false;
const initializeAI = async () => {
  if (!isInitialized) {
    await aiManager.initialize();
    isInitialized = true;
    logger.info('AI Provider Manager initialized');
  }
};

/**
 * POST /api/v1/ai/chat
 * AI对话接口
 * 支持两种格式：
 * 1. { messages: Array } - 标准格式
 * 2. { message: string, context: Object } - 简化格式（用于患者问诊对话）
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    await initializeAI();

    let messages: any[];
    const { maxTokens, temperature, stream = false } = req.body;

    // 判断请求格式
    if (req.body.message && typeof req.body.message === 'string') {
      // 简化格式：{ message: string, context?: object }
      const { message, context } = req.body;

      // 构建系统提示
      let systemPrompt = '你是一位专业的医疗AI助手，负责协助医生进行问诊。';

      if (context) {
        if (context.patientId) {
          systemPrompt += `\n当前患者ID: ${context.patientId}`;
        }
        if (context.symptoms) {
          systemPrompt += `\n患者症状: ${context.symptoms}`;
        }
        if (context.history) {
          systemPrompt += `\n患者病史: ${context.history}`;
        }
      }

      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];
    } else if (req.body.messages && Array.isArray(req.body.messages)) {
      // 标准格式：{ messages: Array }
      messages = req.body.messages;

      if (messages.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'messages array cannot be empty',
        });
        return;
      }
    } else {
      // 无效格式
      res.status(400).json({
        error: 'Invalid request',
        message: 'Either "messages" array or "message" string is required',
      });
      return;
    }

    // 流式响应
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const chunk of aiManager.streamChat({
          messages,
          maxTokens,
          temperature,
        })) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error) {
        logger.error('Stream chat error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      }
    } else {
      // 普通响应
      const response = await aiManager.chat({
        messages,
        maxTokens,
        temperature,
      });

      // 统一返回格式，兼容前端期望的 { message: string }
      // response.message 是一个对象 { role, content }，需要提取 content
      const messageContent = typeof response.message === 'object' && response.message?.content
        ? response.message.content
        : (typeof response.message === 'string' ? response.message : '');

      // 修改data字段，确保message字段是字符串而不是对象
      res.json({
        success: true,
        message: messageContent,
        data: {
          ...response,
          message: messageContent,  // 覆盖原来的message对象为字符串
        },
      });
    }
  } catch (error: any) {
    logger.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/ai/providers
 * 获取可用的AI Provider列表
 */
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    await initializeAI();

    const providers = aiManager.getProviders();
    const currentProvider = aiManager.getCurrentProvider();

    res.json({
      success: true,
      data: {
        current: currentProvider,
        available: providers.map((p: any) => ({
          name: p.name,
          healthy: p.isHealthy(),
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get providers error:', error);
    res.status(500).json({
      error: 'Failed to get providers',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/ai/provider/switch
 * 切换AI Provider
 */
router.post('/provider/switch', async (req: Request, res: Response) => {
  try {
    await initializeAI();

    const { provider } = req.body;

    if (!provider) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'provider is required',
      });
      return;
    }

    aiManager.switchProvider(provider);

    res.json({
      success: true,
      message: `Switched to ${provider}`,
    });
  } catch (error: any) {
    logger.error('Switch provider error:', error);
    res.status(500).json({
      error: 'Failed to switch provider',
      message: error.message,
    });
  }
});

export default router;