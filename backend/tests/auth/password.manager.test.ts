import { PasswordManager } from '../../src/auth/password.manager';

describe('PasswordManager', () => {
  let passwordManager: PasswordManager;

  beforeEach(() => {
    passwordManager = new PasswordManager();
  });

  describe('hashPassword', () => {
    it('应该成功加密密码', async () => {
      const password = 'Test@123456';
      const hash = await passwordManager.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('相同密码生成不同的哈希', async () => {
      const password = 'Test@123456';
      const hash1 = await passwordManager.hashPassword(password);
      const hash2 = await passwordManager.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('应该拒绝弱密码', async () => {
      const weakPassword = '123456';

      await expect(passwordManager.hashPassword(weakPassword)).rejects.toThrow('密码不符合安全要求');
    });
  });

  describe('verifyPassword', () => {
    it('应该验证正确的密码', async () => {
      const password = 'Test@123456';
      const hash = await passwordManager.hashPassword(password);

      const isValid = await passwordManager.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const password = 'Test@123456';
      const wrongPassword = 'Wrong@123456';
      const hash = await passwordManager.hashPassword(password);

      const isValid = await passwordManager.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('应该接受强密码', () => {
      const result = passwordManager.validatePasswordStrength('Test@123456');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('medium');
    });

    it('应该检测超强密码', () => {
      const result = passwordManager.validatePasswordStrength('SuperStrong@123456!');

      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('应该拒绝太短的密码', () => {
      const result = passwordManager.validatePasswordStrength('Ab@1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码长度至少8个字符');
    });

    it('应该要求大写字母', () => {
      const result = passwordManager.validatePasswordStrength('test@123456');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个大写字母');
    });

    it('应该要求小写字母', () => {
      const result = passwordManager.validatePasswordStrength('TEST@123456');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个小写字母');
    });

    it('应该要求数字', () => {
      const result = passwordManager.validatePasswordStrength('Test@Password');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个数字');
    });

    it('应该要求特殊字符', () => {
      const result = passwordManager.validatePasswordStrength('Test123456');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个特殊字符');
    });
  });

  describe('generateRandomPassword', () => {
    it('应该生成符合规则的随机密码', () => {
      const password = passwordManager.generateRandomPassword(12);

      expect(password.length).toBe(12);

      const result = passwordManager.validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
    });

    it('应该生成不同的随机密码', () => {
      const password1 = passwordManager.generateRandomPassword();
      const password2 = passwordManager.generateRandomPassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe('isCommonPassword', () => {
    it('应该检测常见密码', () => {
      expect(passwordManager.isCommonPassword('123456')).toBe(true);
      expect(passwordManager.isCommonPassword('password')).toBe(true);
      expect(passwordManager.isCommonPassword('qwerty')).toBe(true);
    });

    it('应该接受非常见密码', () => {
      expect(passwordManager.isCommonPassword('UncommonPassword123!')).toBe(false);
    });
  });
});