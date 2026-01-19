import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import logger from './utils/logger';
import apiRoutes from './routes/index';
import path from 'path';
import { initializeDefaultAIProvider } from './ai';

// 加载环境变量 - 明确指定.env文件路径
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app: Express = express();
const PORT = process.env.BACKEND_PORT || 3000;

// 中间件配置
app.use(helmet()); // 安全headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(compression()); // 响应压缩
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Cookie解析
app.use(morgan('dev')); // 请求日志

// 健康检查端点
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API根路径
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to AiliaoX API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api-docs'
    }
  });
});

// API路由
app.use('/api/v1', apiRoutes);

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// 全局错误处理
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 初始化AI Provider
    await initializeDefaultAIProvider();
    logger.info('✅ AI Provider initialized successfully');

    app.listen(PORT, () => {
      logger.info(`
🚀 AiliaoX Backend Server is running!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health Check: http://localhost:${PORT}/health
🔗 API: http://localhost:${PORT}/api/v1
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;