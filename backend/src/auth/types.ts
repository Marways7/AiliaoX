/**
 * 认证系统类型定义
 * AiliaoX医院信息系统 - 用户认证与权限管理
 */

import { UserRole } from '@prisma/client';

/**
 * JWT Token载荷
 */
export interface TokenPayload {
  userId: string;
  username: string;
  email?: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Token对
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email?: string;
    role: UserRole;
    name?: string;
    department?: string;
    permissions?: string[]; // 用户权限列表
  };
  tokens: TokenPair;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * 创建用户请求
 */
export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  role: UserRole;

  // 医生信息（当角色为DOCTOR时必填）
  doctor?: {
    doctorNo: string;
    name: string;
    departmentId: string;
    title?: string;
    specialization?: string;
    qualification?: string;
    yearsOfExperience?: number;
    consultationFee?: number;
  };

  // 操作员信息（当角色为OPERATOR时必填）
  operator?: {
    operatorNo: string;
    name: string;
    department?: string;
  };
}

/**
 * 用户响应
 */
export interface UserResponse {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: string;
  doctor?: {
    id: string;
    doctorNo: string;
    name: string;
    department: {
      id: string;
      name: string;
    };
    title?: string;
    specialization?: string;
  };
  operator?: {
    id: string;
    operatorNo: string;
    name: string;
    department?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 权限定义
 */
export enum Permission {
  // 患者管理权限
  PATIENT_VIEW = 'patient:view',
  PATIENT_CREATE = 'patient:create',
  PATIENT_UPDATE = 'patient:update',
  PATIENT_DELETE = 'patient:delete',

  // 挂号管理权限
  APPOINTMENT_VIEW = 'appointment:view',
  APPOINTMENT_CREATE = 'appointment:create',
  APPOINTMENT_UPDATE = 'appointment:update',
  APPOINTMENT_DELETE = 'appointment:delete',

  // 排队管理权限
  QUEUE_VIEW = 'queue:view',
  QUEUE_CREATE = 'queue:create',
  QUEUE_UPDATE = 'queue:update',
  QUEUE_DELETE = 'queue:delete',
  QUEUE_CALL = 'queue:call',

  // 药物管理权限
  MEDICINE_VIEW = 'medicine:view',
  MEDICINE_CREATE = 'medicine:create',
  MEDICINE_UPDATE = 'medicine:update',
  MEDICINE_DELETE = 'medicine:delete',
  MEDICINE_CATEGORY_MANAGE = 'medicine:category:manage',

  // 处方管理权限
  PRESCRIPTION_VIEW = 'prescription:view',
  PRESCRIPTION_CREATE = 'prescription:create',
  PRESCRIPTION_UPDATE = 'prescription:update',
  PRESCRIPTION_APPROVE = 'prescription:approve',
  PRESCRIPTION_DISPENSE = 'prescription:dispense',
  PRESCRIPTION_CANCEL = 'prescription:cancel',

  // AI审查权限
  AI_REVIEW_USE = 'ai:review:use',

  // 病历管理权限（里程碑6）
  MEDICAL_RECORD_VIEW = 'medical_record:read',
  MEDICAL_RECORD_READ = 'medical_record:read',
  MEDICAL_RECORD_CREATE = 'medical_record:create',
  MEDICAL_RECORD_UPDATE = 'medical_record:update',
  MEDICAL_RECORD_DELETE = 'medical_record:delete',
  MEDICAL_RECORD_SUBMIT = 'medical_record:submit',
  MEDICAL_RECORD_APPROVE = 'medical_record:approve',

  // 诊断管理权限（里程碑6）
  DIAGNOSIS_VIEW = 'diagnosis:read',
  DIAGNOSIS_READ = 'diagnosis:read',
  DIAGNOSIS_CREATE = 'diagnosis:create',
  DIAGNOSIS_UPDATE = 'diagnosis:update',
  DIAGNOSIS_DELETE = 'diagnosis:delete',

  // 病历模板权限（里程碑6）
  RECORD_TEMPLATE_VIEW = 'record_template:read',
  RECORD_TEMPLATE_READ = 'record_template:read',
  RECORD_TEMPLATE_CREATE = 'record_template:create',
  RECORD_TEMPLATE_UPDATE = 'record_template:update',
  RECORD_TEMPLATE_DELETE = 'record_template:delete',

  // 旧版病历权限（向后兼容）
  RECORD_VIEW_OWN = 'record:view:own',
  RECORD_VIEW_ALL = 'record:view:all',
  RECORD_CREATE = 'record:create',
  RECORD_UPDATE = 'record:update',

  // 统计报表权限
  STATISTICS_VIEW = 'statistics:view', // 里程碑7: 统计数据查看
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',

  // 系统管理权限
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MANAGE = 'system:manage', // 系统管理（包括公告管理）
  ANNOUNCEMENT_PUBLISH = 'announcement:publish'
}

/**
 * 角色权限映射
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_MANAGE, // 系统管理（包括公告管理）
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    // 管理员拥有所有权限
    ...Object.values(Permission)
  ],

  DOCTOR: [
    Permission.PATIENT_VIEW,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.PATIENT_DELETE,
    Permission.APPOINTMENT_VIEW,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_UPDATE,
    Permission.QUEUE_VIEW,
    Permission.QUEUE_CALL,
    Permission.QUEUE_UPDATE,
    Permission.MEDICINE_VIEW,
    Permission.PRESCRIPTION_VIEW,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_UPDATE,
    Permission.PRESCRIPTION_APPROVE,
    Permission.PRESCRIPTION_CANCEL,
    Permission.AI_REVIEW_USE,
    // 里程碑6: 病历管理权限
    Permission.MEDICAL_RECORD_VIEW,
    Permission.MEDICAL_RECORD_READ,
    Permission.MEDICAL_RECORD_CREATE,
    Permission.MEDICAL_RECORD_UPDATE,
    Permission.MEDICAL_RECORD_DELETE,
    Permission.MEDICAL_RECORD_SUBMIT,
    Permission.MEDICAL_RECORD_APPROVE,
    // 里程碑6: 诊断管理权限
    Permission.DIAGNOSIS_VIEW,
    Permission.DIAGNOSIS_READ,
    Permission.DIAGNOSIS_CREATE,
    Permission.DIAGNOSIS_UPDATE,
    Permission.DIAGNOSIS_DELETE,
    // 里程碑6: 病历模板权限
    Permission.RECORD_TEMPLATE_VIEW,
    Permission.RECORD_TEMPLATE_READ,
    Permission.RECORD_TEMPLATE_CREATE,
    Permission.RECORD_TEMPLATE_UPDATE,
    Permission.RECORD_TEMPLATE_DELETE,
    // 旧版权限（向后兼容）
    Permission.RECORD_VIEW_ALL,
    Permission.RECORD_CREATE,
    Permission.RECORD_UPDATE,
    // 里程碑7: 统计报表权限
    Permission.STATISTICS_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT
  ],

  OPERATOR: [
    Permission.PATIENT_VIEW,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.PATIENT_DELETE,
    Permission.APPOINTMENT_VIEW,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_UPDATE,
    Permission.APPOINTMENT_DELETE,
    Permission.QUEUE_VIEW,
    Permission.QUEUE_CREATE,
    Permission.QUEUE_DELETE,
    Permission.MEDICINE_VIEW,
    Permission.PRESCRIPTION_VIEW,
    Permission.PRESCRIPTION_DISPENSE,
    // 里程碑6: 病历查看权限（操作员只能查看）
    Permission.MEDICAL_RECORD_VIEW,
    Permission.MEDICAL_RECORD_READ,
    Permission.DIAGNOSIS_VIEW,
    Permission.DIAGNOSIS_READ,
    Permission.RECORD_TEMPLATE_VIEW,
    Permission.RECORD_TEMPLATE_READ,
    // 旧版权限（向后兼容）
    Permission.RECORD_VIEW_OWN,
    // 里程碑7: 统计报表权限
    Permission.STATISTICS_VIEW,
    Permission.REPORT_VIEW,
    Permission.ANNOUNCEMENT_PUBLISH
  ],

  PATIENT: [
    Permission.APPOINTMENT_VIEW,
    Permission.QUEUE_VIEW,
    Permission.PRESCRIPTION_VIEW,
    // 里程碑6: 患者只能查看自己的病历
    Permission.MEDICAL_RECORD_VIEW,
    Permission.DIAGNOSIS_VIEW,
    // 旧版权限（向后兼容）
    Permission.RECORD_VIEW_OWN
  ]
};

/**
 * 认证错误
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 认证错误代码
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH001',
  TOKEN_EXPIRED = 'AUTH002',
  TOKEN_INVALID = 'AUTH003',
  REFRESH_TOKEN_EXPIRED = 'AUTH004',
  REFRESH_TOKEN_INVALID = 'AUTH005',
  UNAUTHORIZED = 'AUTH006',
  FORBIDDEN = 'AUTH007',
  USER_NOT_FOUND = 'AUTH008',
  USER_INACTIVE = 'AUTH009',
  USER_SUSPENDED = 'AUTH010',
  PASSWORD_INCORRECT = 'AUTH011',
  PASSWORD_TOO_WEAK = 'AUTH012',
  TOKEN_REVOKED = 'AUTH013'
}

/**
 * 密码强度规则
 */
export interface PasswordRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

/**
 * 默认密码规则
 */
export const DEFAULT_PASSWORD_RULES: PasswordRules = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
};
