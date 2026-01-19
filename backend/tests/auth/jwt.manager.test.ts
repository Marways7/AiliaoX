import { JWTManager } from '../../src/auth/jwt.manager';
import { UserRole } from '@prisma/client';

describe('JWTManager', () => {
  let jwtManager: JWTManager;

  beforeEach(() => {
    jwtManager = new JWTManager(
      'test-secret',
      'test-refresh-secret',
      '15m',
      '7d'
    );
  });

  describe('generateTokens', () => {
    it('应该生成Token对', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900); // 15分钟 = 900秒
      expect(tokens.refreshExpiresIn).toBe(604800); // 7天 = 604800秒
    });

    it('生成的Token应该包含正确的载荷', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      const payload = jwtManager.decodeToken(tokens.accessToken);

      expect(payload?.userId).toBe('user-123');
      expect(payload?.username).toBe('testuser');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.role).toBe(UserRole.DOCTOR);
      expect(payload?.type).toBe('access');
    });
  });

  describe('verifyAccessToken', () => {
    it('应该验证有效的Access Token', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      const payload = jwtManager.verifyAccessToken(tokens.accessToken);

      expect(payload.userId).toBe('user-123');
      expect(payload.username).toBe('testuser');
      expect(payload.role).toBe(UserRole.DOCTOR);
    });

    it('应该拒绝无效的Token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        jwtManager.verifyAccessToken(invalidToken);
      }).toThrow('无效的Access Token');
    });

    it('应该拒绝Refresh Token作为Access Token', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      expect(() => {
        jwtManager.verifyAccessToken(tokens.refreshToken);
      }).toThrow('无效的Token类型');
    });

    it('应该拒绝已撤销的Token', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      jwtManager.revokeToken(tokens.accessToken);

      expect(() => {
        jwtManager.verifyAccessToken(tokens.accessToken);
      }).toThrow('Token已被撤销');
    });
  });

  describe('verifyRefreshToken', () => {
    it('应该验证有效的Refresh Token', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      const payload = jwtManager.verifyRefreshToken(tokens.refreshToken);

      expect(payload.userId).toBe('user-123');
      expect(payload.username).toBe('testuser');
      expect(payload.type).toBe('refresh');
    });

    it('应该拒绝Access Token作为Refresh Token', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      expect(() => {
        jwtManager.verifyRefreshToken(tokens.accessToken);
      }).toThrow('无效的Token类型');
    });
  });

  describe('refreshTokens', () => {
    it('应该使用Refresh Token生成新的Token对', () => {
      const originalTokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      const newTokens = jwtManager.refreshTokens(originalTokens.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    it('应该撤销旧的Refresh Token', () => {
      const originalTokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      jwtManager.refreshTokens(originalTokens.refreshToken);

      expect(() => {
        jwtManager.verifyRefreshToken(originalTokens.refreshToken);
      }).toThrow('Refresh Token已被撤销');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('应该从Authorization header提取Token', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const token = jwtManager.extractTokenFromHeader(authHeader);

      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token');
    });

    it('应该处理无效的header格式', () => {
      expect(jwtManager.extractTokenFromHeader('InvalidHeader')).toBeNull();
      expect(jwtManager.extractTokenFromHeader('Basic auth')).toBeNull();
      expect(jwtManager.extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe('revokeToken', () => {
    it('应该撤销Token', () => {
      const tokens = jwtManager.generateTokens(
        'user-123',
        'testuser',
        'test@example.com',
        UserRole.DOCTOR
      );

      jwtManager.revokeToken(tokens.accessToken);

      expect(jwtManager.isTokenRevoked(tokens.accessToken)).toBe(true);
    });
  });

  describe('generateSecret', () => {
    it('应该生成随机密钥', () => {
      const secret1 = JWTManager.generateSecret();
      const secret2 = JWTManager.generateSecret();

      expect(secret1.length).toBe(64);
      expect(secret2.length).toBe(64);
      expect(secret1).not.toBe(secret2);
    });
  });
});