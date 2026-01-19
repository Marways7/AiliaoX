import * as jwt from 'jsonwebtoken';
import { TokenPayload, TokenPair, AuthError, AuthErrorCode } from './types';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * JWT Token管理器
 * 处理JWT Token的生成、验证、刷新和撤销
 */
export class JWTManager {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;
  private issuer: string;
  private revokedTokens: Set<string> = new Set(); // 简单的内存黑名单，生产环境应使用Redis

  constructor(
    accessTokenSecret: string = process.env.JWT_SECRET || 'default-secret-change-in-production',
    refreshTokenSecret: string = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
    accessTokenExpiry: string = process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiry: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: string = 'AiliaoX'
  ) {
    this.accessTokenSecret = accessTokenSecret;
    this.refreshTokenSecret = refreshTokenSecret;
    this.accessTokenExpiry = accessTokenExpiry;
    this.refreshTokenExpiry = refreshTokenExpiry;
    this.issuer = issuer;

    // 警告：使用默认密钥
    if (accessTokenSecret.includes('default')) {
      logger.warn('使用默认JWT密钥，请在生产环境中设置JWT_SECRET环境变量');
    }
  }

  /**
   * 生成Token对
   */
  generateTokens(userId: string, username: string, email: string | undefined, role: UserRole): TokenPair {
    // Access Token载荷
    const accessPayload: TokenPayload = {
      userId,
      username,
      email,
      role,
      type: 'access'
    };

    // Refresh Token载荷
    const refreshPayload: TokenPayload = {
      userId,
      username,
      email,
      role,
      type: 'refresh'
    };

    // 生成Access Token
    const accessToken = jwt.sign(
      accessPayload,
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiry,
        issuer: this.issuer,
        subject: userId
      } as jwt.SignOptions
    );

    // 生成Refresh Token
    const refreshToken = jwt.sign(
      refreshPayload,
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: this.issuer,
        subject: userId
      } as jwt.SignOptions
    );

    // 计算过期时间（秒）
    const accessExpiresIn = this.parseExpiry(this.accessTokenExpiry);
    const refreshExpiresIn = this.parseExpiry(this.refreshTokenExpiry);

    logger.info(`生成Token对 - 用户: ${username}, 角色: ${role}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresIn: refreshExpiresIn
    };
  }

  /**
   * 验证Access Token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      // 检查是否在黑名单中
      if (this.isTokenRevoked(token)) {
        throw new AuthError(
          'Token已被撤销',
          AuthErrorCode.TOKEN_REVOKED
        );
      }

      // 验证Token
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer
      }) as TokenPayload;

      // 确保是Access Token
      if (payload.type !== 'access') {
        throw new AuthError(
          '无效的Token类型',
          AuthErrorCode.TOKEN_INVALID
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError(
          'Access Token已过期',
          AuthErrorCode.TOKEN_EXPIRED
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError(
          '无效的Access Token',
          AuthErrorCode.TOKEN_INVALID
        );
      } else if (error instanceof AuthError) {
        throw error;
      } else {
        throw new AuthError(
          'Token验证失败',
          AuthErrorCode.TOKEN_INVALID
        );
      }
    }
  }

  /**
   * 验证Refresh Token
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      // 检查是否在黑名单中
      if (this.isTokenRevoked(token)) {
        throw new AuthError(
          'Refresh Token已被撤销',
          AuthErrorCode.TOKEN_REVOKED
        );
      }

      // 验证Token
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer
      }) as TokenPayload;

      // 确保是Refresh Token
      if (payload.type !== 'refresh') {
        throw new AuthError(
          '无效的Token类型',
          AuthErrorCode.REFRESH_TOKEN_INVALID
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError(
          'Refresh Token已过期',
          AuthErrorCode.REFRESH_TOKEN_EXPIRED
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError(
          '无效的Refresh Token',
          AuthErrorCode.REFRESH_TOKEN_INVALID
        );
      } else if (error instanceof AuthError) {
        throw error;
      } else {
        throw new AuthError(
          'Refresh Token验证失败',
          AuthErrorCode.REFRESH_TOKEN_INVALID
        );
      }
    }
  }

  /**
   * 刷新Token
   */
  refreshTokens(refreshToken: string): TokenPair {
    // 验证Refresh Token
    const payload = this.verifyRefreshToken(refreshToken);

    // 撤销旧的Refresh Token
    this.revokeToken(refreshToken);

    // 生成新的Token对
    return this.generateTokens(
      payload.userId,
      payload.username,
      payload.email,
      payload.role
    );
  }

  /**
   * 撤销Token
   */
  revokeToken(token: string): void {
    this.revokedTokens.add(token);
    logger.info(`Token已撤销: ${token.substring(0, 20)}...`);

    // 定期清理过期的撤销记录（避免内存泄漏）
    this.cleanupRevokedTokens();
  }

  /**
   * 检查Token是否被撤销
   */
  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  /**
   * 解码Token（不验证）
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * 从Authorization header提取Token
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * 解析过期时间字符串为秒数
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // 默认15分钟
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  /**
   * 清理过期的撤销记录
   */
  private cleanupRevokedTokens(): void {
    // 简单实现：当撤销列表超过1000个时，清空
    // 生产环境应该使用Redis并设置TTL
    if (this.revokedTokens.size > 1000) {
      this.revokedTokens.clear();
      logger.info('清理Token撤销列表');
    }
  }

  /**
   * 生成密钥（用于初始化）
   */
  static generateSecret(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  }
}