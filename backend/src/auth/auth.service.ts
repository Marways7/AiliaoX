import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { JWTManager } from './jwt.manager';
import { PasswordManager } from './password.manager';
import {
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  UserResponse,
  ChangePasswordRequest,
  AuthError,
  AuthErrorCode,
  TokenPair,
  RolePermissions
} from './types';
import { logger } from '../utils/logger';

/**
 * 认证服务
 * 处理用户登录、登出、Token管理等认证相关业务
 */
export class AuthService {
  private prisma: PrismaClient;
  private jwtManager: JWTManager;
  private passwordManager: PasswordManager;

  constructor(
    prisma: PrismaClient = new PrismaClient(),
    jwtManager: JWTManager = new JWTManager(),
    passwordManager: PasswordManager = new PasswordManager()
  ) {
    this.prisma = prisma;
    this.jwtManager = jwtManager;
    this.passwordManager = passwordManager;
  }

  /**
   * 用户登录
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { username, password } = request;

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        doctor: {
          include: {
            department: true
          }
        },
        operator: true
      }
    });

    if (!user) {
      logger.warn(`登录失败 - 用户不存在: ${username}`);
      throw new AuthError(
        '用户名或密码错误',
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // 检查用户状态
    if (user.status === UserStatus.INACTIVE) {
      throw new AuthError(
        '用户账号未激活',
        AuthErrorCode.USER_INACTIVE,
        403
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AuthError(
        '用户账号已被暂停',
        AuthErrorCode.USER_SUSPENDED,
        403
      );
    }

    // 验证密码
    const isValidPassword = await this.passwordManager.verifyPassword(
      password,
      user.passwordHash
    );

    if (!isValidPassword) {
      // 记录失败的登录尝试
      await this.recordLoginAttempt(user.id, false);
      logger.warn(`登录失败 - 密码错误: ${username}`);
      throw new AuthError(
        '用户名或密码错误',
        AuthErrorCode.INVALID_CREDENTIALS
      );
    }

    // 生成Token
    const tokens = this.jwtManager.generateTokens(
      user.id,
      user.username,
      user.email || undefined,
      user.role
    );

    // 记录成功的登录
    await this.recordLoginAttempt(user.id, true);

    // 使用mapUserToResponse映射完整用户信息
    const userResponse = this.mapUserToResponse(user);

    // 构建响应
    const response: LoginResponse = {
      user: userResponse,
      tokens
    };

    logger.info(`登录成功 - 用户: ${username}, 角色: ${user.role}`);
    return response;
  }

  /**
   * 用户登出
   */
  async logout(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    // 撤销Token
    this.jwtManager.revokeToken(accessToken);
    if (refreshToken) {
      this.jwtManager.revokeToken(refreshToken);
    }

    logger.info(`登出成功 - 用户ID: ${userId}`);
  }

  /**
   * 刷新Token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    return this.jwtManager.refreshTokens(refreshToken);
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        doctor: {
          include: {
            department: true
          }
        },
        operator: true
      }
    });

    if (!user) {
      throw new AuthError(
        '用户不存在',
        AuthErrorCode.USER_NOT_FOUND,
        404
      );
    }

    return this.mapUserToResponse(user);
  }

  /**
   * 修改密码
   */
  async changePassword(
    userId: string,
    request: ChangePasswordRequest
  ): Promise<void> {
    const { oldPassword, newPassword } = request;

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AuthError(
        '用户不存在',
        AuthErrorCode.USER_NOT_FOUND,
        404
      );
    }

    // 验证旧密码
    const isValidPassword = await this.passwordManager.verifyPassword(
      oldPassword,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new AuthError(
        '原密码错误',
        AuthErrorCode.PASSWORD_INCORRECT,
        400
      );
    }

    // 检查新密码是否与旧密码相同
    if (this.passwordManager.isSamePassword(oldPassword, newPassword)) {
      throw new AuthError(
        '新密码不能与旧密码相同',
        AuthErrorCode.PASSWORD_INCORRECT,
        400
      );
    }

    // 加密新密码
    const newPasswordHash = await this.passwordManager.hashPassword(newPassword);

    // 更新密码
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
        updatedBy: userId
      }
    });

    logger.info(`密码修改成功 - 用户ID: ${userId}`);
  }

  /**
   * 创建用户
   */
  async createUser(request: CreateUserRequest, creatorId: string): Promise<UserResponse> {
    const { username, password, email, phone, role, doctor, operator } = request;

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new AuthError(
        '用户名已存在',
        AuthErrorCode.INVALID_CREDENTIALS,
        400
      );
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email }
      });

      if (existingEmail) {
        throw new AuthError(
          '邮箱已被注册',
          AuthErrorCode.INVALID_CREDENTIALS,
          400
        );
      }
    }

    // 加密密码
    const passwordHash = await this.passwordManager.hashPassword(password);

    // 创建用户事务
    const newUser = await this.prisma.$transaction(async (tx) => {
      // 创建用户
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          email,
          phone,
          role,
          status: UserStatus.ACTIVE,
          createdBy: creatorId,
          updatedBy: creatorId
        }
      });

      // 如果是医生，创建医生记录
      if (role === UserRole.DOCTOR && doctor) {
        await tx.doctor.create({
          data: {
            userId: user.id,
            doctorNo: doctor.doctorNo,
            name: doctor.name,
            departmentId: doctor.departmentId,
            title: doctor.title,
            specialization: doctor.specialization,
            qualification: doctor.qualification,
            yearsOfExperience: doctor.yearsOfExperience,
            consultationFee: doctor.consultationFee
          }
        });
      }

      // 如果是操作员，创建操作员记录
      if (role === UserRole.OPERATOR && operator) {
        await tx.operator.create({
          data: {
            userId: user.id,
            operatorNo: operator.operatorNo,
            name: operator.name,
            department: operator.department
          }
        });
      }

      // 返回完整的用户信息
      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          doctor: {
            include: {
              department: true
            }
          },
          operator: true
        }
      });
    });

    if (!newUser) {
      throw new Error('创建用户失败');
    }

    logger.info(`用户创建成功 - 用户名: ${username}, 角色: ${role}`);
    return this.mapUserToResponse(newUser);
  }

  /**
   * 记录登录尝试
   */
  private async recordLoginAttempt(
    userId: string,
    success: boolean
  ): Promise<void> {
    try {
      await this.prisma.loginLog.create({
        data: {
          userId,
          success,
          ip: '127.0.0.1', // TODO: 从请求中获取真实IP
          userAgent: 'Unknown' // TODO: 从请求中获取User-Agent
        }
      });
    } catch (error) {
      logger.error('记录登录日志失败:', error);
    }
  }

  /**
   * 映射用户实体到响应对象
   */
  private mapUserToResponse(user: any): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      doctor: user.doctor ? {
        id: user.doctor.id,
        doctorNo: user.doctor.doctorNo,
        name: user.doctor.name,
        department: {
          id: user.doctor.department.id,
          name: user.doctor.department.name
        },
        title: user.doctor.title,
        specialization: user.doctor.specialization
      } : undefined,
      operator: user.operator ? {
        id: user.operator.id,
        operatorNo: user.operator.operatorNo,
        name: user.operator.name,
        department: user.operator.department
      } : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}