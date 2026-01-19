import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = Router();
const authService = new AuthService(prisma);

// 登录请求验证
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
  rememberMe: z.boolean().optional()
});

// 修改密码请求验证
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '原密码不能为空'),
  newPassword: z.string().min(8, '新密码至少8个字符')
});

/**
 * POST /api/v1/auth/login
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const validatedData = loginSchema.parse(req.body);

    // 执行登录
    const result = await authService.login(validatedData);

    // 设置刷新Token到httpOnly cookie（更安全）
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.tokens.refreshExpiresIn * 1000 // 转换为毫秒
    });

    return res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          details: error.errors
        }
      });
    }

    logger.error('登录错误:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'AUTH_ERROR',
        message: error.message || '登录失败'
      }
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * 用户登出
 */
router.post('/logout', authMiddleware.authenticate(), async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未登录'
        }
      });
    }

    // 从cookie获取refreshToken
    const refreshToken = req.cookies?.refreshToken;

    // 执行登出
    await authService.logout(req.user.userId, req.token, refreshToken);

    // 清除cookie
    res.clearCookie('refreshToken');

    return res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error: any) {
    logger.error('登出错误:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: '登出失败'
      }
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * 刷新Token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // 优先从cookie获取refreshToken，其次从body获取
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_MISSING',
          message: '未提供Refresh Token'
        }
      });
    }

    // 刷新Token
    const tokens = await authService.refreshToken(refreshToken);

    // 更新cookie中的refreshToken
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.refreshExpiresIn * 1000
    });

    return res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }
    });
  } catch (error: any) {
    logger.error('刷新Token错误:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'REFRESH_ERROR',
        message: error.message || '刷新Token失败'
      }
    });
  }
});

/**
 * GET /api/v1/auth/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware.authenticate(), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未登录'
        }
      });
    }

    // 获取用户详细信息
    const user = await authService.getCurrentUser(req.user.userId);

    return res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    logger.error('获取用户信息错误:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'USER_ERROR',
        message: error.message || '获取用户信息失败'
      }
    });
  }
});

/**
 * PUT /api/v1/auth/password
 * 修改密码
 */
router.put('/password', authMiddleware.authenticate(), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未登录'
        }
      });
    }

    // 验证请求数据
    const validatedData = changePasswordSchema.parse(req.body);

    // 修改密码
    await authService.changePassword(req.user.userId, validatedData);

    return res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          details: error.errors
        }
      });
    }

    logger.error('修改密码错误:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'PASSWORD_ERROR',
        message: error.message || '修改密码失败'
      }
    });
  }
});

export default router;