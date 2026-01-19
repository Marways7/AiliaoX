/**
 * 认证模块导出
 * 提供认证系统的所有公共接口
 */

// 导出类型定义
export * from './types';

// 导出核心类
export { JWTManager } from './jwt.manager';
export { PasswordManager } from './password.manager';
export { AuthService } from './auth.service';

// 导出中间件
export { authMiddleware, AuthMiddleware } from '../middleware/auth.middleware';

// 默认实例
import { JWTManager } from './jwt.manager';
import { PasswordManager } from './password.manager';
import { AuthService } from './auth.service';
import { prisma } from '../utils/prisma';

// 创建默认实例
const jwtManager = new JWTManager();
const passwordManager = new PasswordManager();
const authService = new AuthService(prisma, jwtManager, passwordManager);

export default {
  jwtManager,
  passwordManager,
  authService
};