import { Request, Response, NextFunction } from 'express';
import { JWTManager } from '../auth/jwt.manager';
import { AuthError, AuthErrorCode, Permission, RolePermissions } from '../auth/types';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';

// 扩展Express的Request接口
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email?: string;
        role: UserRole;
      };
      token?: string;
    }
  }
}

/**
 * JWT认证中间件
 * 验证请求中的JWT Token并解析用户信息
 */
export class AuthMiddleware {
  private jwtManager: JWTManager;

  constructor(jwtManager: JWTManager = new JWTManager()) {
    this.jwtManager = jwtManager;
  }

  /**
   * 验证JWT Token
   * @param required 是否必须提供Token（默认为true）
   */
  authenticate(required: boolean = true) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 从Authorization header提取Token
        const authHeader = req.headers.authorization;
        const token = this.jwtManager.extractTokenFromHeader(authHeader);

        if (!token) {
          if (required) {
            throw new AuthError(
              '未提供认证Token',
              AuthErrorCode.UNAUTHORIZED
            );
          }
          // 如果Token不是必需的，继续处理请求
          return next();
        }

        // 验证Token
        const payload = this.jwtManager.verifyAccessToken(token);

        // 将用户信息附加到请求对象
        req.user = {
          userId: payload.userId,
          username: payload.username,
          email: payload.email,
          role: payload.role
        };
        req.token = token;

        logger.debug(`认证成功 - 用户: ${payload.username}, 角色: ${payload.role}`);
        next();
      } catch (error) {
        if (error instanceof AuthError) {
          logger.warn(`认证失败: ${error.message}`);
          return res.status(error.statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message
            }
          });
        }

        logger.error('认证中间件错误:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'AUTH000',
            message: '认证服务异常'
          }
        });
      }
    };
  }

  /**
   * 检查用户角色
   * @param allowedRoles 允许的角色列表
   */
  requireRole(...allowedRoles: UserRole[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 确保用户已认证
        if (!req.user) {
          throw new AuthError(
            '请先登录',
            AuthErrorCode.UNAUTHORIZED
          );
        }

        // 检查用户角色
        if (!allowedRoles.includes(req.user.role)) {
          throw new AuthError(
            '无权访问该资源',
            AuthErrorCode.FORBIDDEN,
            403
          );
        }

        logger.debug(`角色验证通过 - 用户: ${req.user.username}, 角色: ${req.user.role}`);
        return next();
      } catch (error) {
        if (error instanceof AuthError) {
          return res.status(error.statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message
            }
          });
        }

        logger.error('角色验证错误:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'AUTH000',
            message: '权限验证服务异常'
          }
        });
      }
    };
  }

  /**
   * 检查用户权限
   * @param requiredPermission 需要的权限
   */
  requirePermission(requiredPermission: Permission) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 确保用户已认证
        if (!req.user) {
          throw new AuthError(
            '请先登录',
            AuthErrorCode.UNAUTHORIZED
          );
        }

        // 管理员拥有所有权限
        if (req.user.role === UserRole.ADMIN) {
          return next();
        }

        // 获取角色的权限列表
        const permissions = RolePermissions[req.user.role] || [];

        // 检查是否有所需权限
        if (!permissions.includes(requiredPermission)) {
          throw new AuthError(
            `缺少权限: ${requiredPermission}`,
            AuthErrorCode.FORBIDDEN,
            403
          );
        }

        logger.debug(`权限验证通过 - 用户: ${req.user.username}, 权限: ${requiredPermission}`);
        next();
      } catch (error) {
        if (error instanceof AuthError) {
          return res.status(error.statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message
            }
          });
        }

        logger.error('权限验证错误:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'AUTH000',
            message: '权限验证服务异常'
          }
        });
      }
    };
  }

  /**
   * 可选认证
   * 如果提供了Token则验证，否则继续处理请求
   */
  optionalAuthenticate() {
    return this.authenticate(false);
  }

  /**
   * 刷新Token中间件
   * 专门用于刷新Token的端点
   */
  refreshTokenHandler() {
    return async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
          throw new AuthError(
            '未提供Refresh Token',
            AuthErrorCode.REFRESH_TOKEN_INVALID,
            400
          );
        }

        // 验证Refresh Token并生成新Token对
        const tokens = this.jwtManager.refreshTokens(refreshToken);

        return res.json({
          success: true,
          data: tokens
        });
      } catch (error) {
        if (error instanceof AuthError) {
          return res.status(error.statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message
            }
          });
        }

        logger.error('刷新Token错误:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'AUTH000',
            message: 'Token刷新服务异常'
          }
        });
      }
    };
  }
}

// 创建默认实例
export const authMiddleware = new AuthMiddleware();