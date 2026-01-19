import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { MCPClient } from '../mcp/client';

const router = Router();
const mcpClient = new MCPClient({
  configPath: './mcp.json',
});

// 初始化MCP Client
let isConnected = false;
const connectMCP = async () => {
  if (!isConnected) {
    await mcpClient.connect('mysql-mcp');
    isConnected = true;
    logger.info('MCP Client connected to MySQL MCP Server');
  }
};

/**
 * POST /api/v1/mcp/query
 * 执行自然语言数据库查询
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    await connectMCP();

    const { query, context } = req.body;

    if (!query) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'query is required',
      });
      return;
    }

    const result = await mcpClient.executeQuery(query, context);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('MCP query error:', error);
    res.status(500).json({
      error: 'Query failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/mcp/tools
 * 获取可用的MCP工具列表
 */
router.get('/tools', async (_req: Request, res: Response) => {
  try {
    await connectMCP();

    const tools = await mcpClient.listTools();

    res.json({
      success: true,
      data: tools,
    });
  } catch (error: any) {
    logger.error('Get MCP tools error:', error);
    res.status(500).json({
      error: 'Failed to get tools',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/mcp/tool/call
 * 调用指定的MCP工具
 */
router.post('/tool/call', async (req: Request, res: Response) => {
  try {
    await connectMCP();

    const { tool, params } = req.body;

    if (!tool) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'tool is required',
      });
      return;
    }

    const result = await mcpClient.callTool(tool, params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Call MCP tool error:', error);
    res.status(500).json({
      error: 'Tool call failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/mcp/status
 * 获取MCP连接状态
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const connected = mcpClient.isConnected();
    const metrics = mcpClient.getMetrics();

    res.json({
      success: true,
      data: {
        connected,
        metrics,
      },
    });
  } catch (error: any) {
    logger.error('Get MCP status error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message,
    });
  }
});

export default router;