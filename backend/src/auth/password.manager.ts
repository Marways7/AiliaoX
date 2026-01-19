import * as bcrypt from 'bcryptjs';
import { DEFAULT_PASSWORD_RULES, PasswordRules, AuthError, AuthErrorCode } from './types';

/**
 * 密码管理器
 * 处理密码加密、验证和强度检查
 */
export class PasswordManager {
  private saltRounds: number;
  private passwordRules: PasswordRules;

  constructor(
    saltRounds: number = 10,
    passwordRules: PasswordRules = DEFAULT_PASSWORD_RULES
  ) {
    this.saltRounds = saltRounds;
    this.passwordRules = passwordRules;
  }

  /**
   * 加密密码
   */
  async hashPassword(password: string): Promise<string> {
    // 验证密码强度
    const validation = this.validatePasswordStrength(password);
    if (!validation.isValid) {
      throw new AuthError(
        `密码不符合安全要求: ${validation.errors.join(', ')}`,
        AuthErrorCode.PASSWORD_TOO_WEAK,
        400
      );
    }

    // 生成哈希
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const errors: string[] = [];

    // 长度检查
    if (password.length < this.passwordRules.minLength) {
      errors.push(`密码长度至少${this.passwordRules.minLength}个字符`);
    }

    // 大写字母检查
    if (this.passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    }

    // 小写字母检查
    if (this.passwordRules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    }

    // 数字检查
    if (this.passwordRules.requireNumber && !/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    }

    // 特殊字符检查
    if (this.passwordRules.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符');
    }

    // 计算强度
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (errors.length === 0) {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      const complexity = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

      if (password.length >= 12 && complexity >= 4) {
        strength = 'strong';
      } else if (password.length >= 10 && complexity >= 3) {
        strength = 'medium';
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * 生成随机密码
   */
  generateRandomPassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = '';
    let password = '';

    // 确保至少包含每种字符类型
    if (this.passwordRules.requireUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      chars += uppercase;
    }
    if (this.passwordRules.requireLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      chars += lowercase;
    }
    if (this.passwordRules.requireNumber) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
      chars += numbers;
    }
    if (this.passwordRules.requireSpecialChar) {
      password += special[Math.floor(Math.random() * special.length)];
      chars += special;
    }

    // 填充剩余长度
    for (let i = password.length; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // 打乱顺序
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * 比较两个密码是否相同
   */
  isSamePassword(password1: string, password2: string): boolean {
    return password1 === password2;
  }

  /**
   * 检查密码是否在常用密码列表中
   */
  isCommonPassword(password: string): boolean {
    const commonPasswords = [
      '123456', 'password', '123456789', '12345678', '12345',
      '1234567', '1234567890', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }
}