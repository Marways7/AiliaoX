import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { UserRole, UserStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = Router();
const authService = new AuthService(prisma);

// 创建用户请求验证
const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50),
  password: z.string().min(8, '密码至少8个字符'),
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
  role: z.nativeEnum(UserRole),

  // 医生信息
  doctor: z.object({
    doctorNo: z.string().min(1, '医生编号不能为空'),
    name: z.string().min(1, '医生姓名不能为空'),
    departmentId: z.string().uuid('科室ID格式不正确'),
    title: z.string().optional(),
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    yearsOfExperience: z.number().min(0).optional(),
    consultationFee: z.number().min(0).optional()
  }).optional(),

  // 操作员信息
  operator: z.object({
    operatorNo: z.string().min(1, '操作员编号不能为空'),
    name: z.string().min(1, '操作员姓名不能为空'),
    department: z.string().optional()
  }).optional()
}).refine((data) => {
  // 如果是医生角色，必须提供医生信息
  if (data.role === UserRole.DOCTOR) {
    return !!data.doctor;
  }
  // 如果是操作员角色，必须提供操作员信息
  if (data.role === UserRole.OPERATOR) {
    return !!data.operator;
  }
  return true;
}, {
  message: '角色信息不完整'
});

// 更新用户请求验证
const updateUserSchema = z.object({
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
  status: z.nativeEnum(UserStatus).optional(),

  // 医生信息更新
  doctor: z.object({
    name: z.string().optional(),
    departmentId: z.string().uuid().optional(),
    title: z.string().optional(),
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    yearsOfExperience: z.number().min(0).optional(),
    consultationFee: z.number().min(0).optional()
  }).optional(),

  // 操作员信息更新
  operator: z.object({
    name: z.string().optional(),
    department: z.string().optional()
  }).optional()
});

// 查询参数验证
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().optional()
});

/**
 * GET /api/v1/users
 * 获取用户列表（需要USER_VIEW权限）
 */
router.get('/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.USER_VIEW),
  async (req: Request, res: Response) => {
    try {
      // 验证查询参数
      const query = querySchema.parse(req.query);
      const { page, limit, role, status, search } = query;

      // 构建查询条件
      const where: any = {
        deletedAt: null
      };

      if (role) {
        where.role = role;
      }

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { username: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } }
        ];
      }

      // 查询用户
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            doctor: {
              include: {
                department: true
              }
            },
            operator: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.user.count({ where })
      ]);

      // 映射响应数据
      const data = users.map(user => ({
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
          department: user.doctor.department.name,
          title: user.doctor.title
        } : undefined,
        operator: user.operator ? {
          id: user.operator.id,
          operatorNo: user.operator.operatorNo,
          name: user.operator.name,
          department: user.operator.department
        } : undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      return res.json({
        success: true,
        data: {
          users: data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: error.errors
          }
        });
      }

      logger.error('获取用户列表错误:', error);
      return       res.status(500).json({
        success: false,
        error: {
          code: 'USER_LIST_ERROR',
          message: '获取用户列表失败'
        }
      });
    }
  }
);

/**
 * GET /api/v1/users/:id
 * 获取用户详情（需要USER_VIEW权限）
 */
router.get('/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.USER_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findFirst({
        where: {
          id,
          deletedAt: null
        },
        include: {
          doctor: {
            include: {
              department: true
            }
          },
          operator: true,
          loginLogs: {
            take: 10,
            orderBy: {
              loginAt: 'desc'
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          }
        });
      }

      return res.json({
        success: true,
        data: {
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
            specialization: user.doctor.specialization,
            qualification: user.doctor.qualification,
            yearsOfExperience: user.doctor.yearsOfExperience,
            consultationFee: user.doctor.consultationFee
          } : undefined,
          operator: user.operator ? {
            id: user.operator.id,
            operatorNo: user.operator.operatorNo,
            name: user.operator.name,
            department: user.operator.department
          } : undefined,
          loginHistory: user.loginLogs,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error: any) {
      logger.error('获取用户详情错误:', error);
      return       res.status(500).json({
        success: false,
        error: {
          code: 'USER_DETAIL_ERROR',
          message: '获取用户详情失败'
        }
      });
    }
  }
);

/**
 * POST /api/v1/users
 * 创建用户（需要USER_CREATE权限）
 */
router.post('/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.USER_CREATE),
  async (req: Request, res: Response) => {
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
      const validatedData = createUserSchema.parse(req.body);

      // 创建用户
      const user = await authService.createUser(validatedData, req.user.userId);

      return       res.status(201).json({
        success: true,
        data: user
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

      logger.error('创建用户错误:', error);
      return       res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'USER_CREATE_ERROR',
          message: error.message || '创建用户失败'
        }
      });
    }
  }
);

/**
 * PUT /api/v1/users/:id
 * 更新用户信息（需要USER_UPDATE权限）
 */
router.put('/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.USER_UPDATE),
  async (req: Request, res: Response) => {
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

      const { id } = req.params;

      // 验证请求数据
      const validatedData = updateUserSchema.parse(req.body);

      // 更新用户
      const result = await prisma.$transaction(async (tx) => {
        // 更新用户基本信息
        const user = await tx.user.update({
          where: { id },
          data: {
            email: validatedData.email,
            phone: validatedData.phone,
            status: validatedData.status,
            updatedAt: new Date(),
            updatedBy: req.user!.userId
          }
        });

        // 更新医生信息
        if (validatedData.doctor && user.role === UserRole.DOCTOR) {
          await tx.doctor.update({
            where: { userId: id },
            data: validatedData.doctor
          });
        }

        // 更新操作员信息
        if (validatedData.operator && user.role === UserRole.OPERATOR) {
          await tx.operator.update({
            where: { userId: id },
            data: validatedData.operator
          });
        }

        // 返回更新后的完整信息
        return tx.user.findUnique({
          where: { id },
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

      return res.json({
        success: true,
        data: result
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

      logger.error('更新用户错误:', error);
      return       res.status(500).json({
        success: false,
        error: {
          code: 'USER_UPDATE_ERROR',
          message: '更新用户失败'
        }
      });
    }
  }
);

/**
 * DELETE /api/v1/users/:id
 * 删除用户（软删除，需要USER_DELETE权限）
 */
router.delete('/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.USER_DELETE),
  async (req: Request, res: Response) => {
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

      const { id } = req.params;

      // 防止删除自己
      if (id === req.user.userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE_SELF',
            message: '不能删除自己的账号'
          }
        });
      }

      // 软删除用户
      await prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy: req.user.userId
        }
      });

      return res.json({
        success: true,
        message: '用户删除成功'
      });
    } catch (error: any) {
      logger.error('删除用户错误:', error);
      return       res.status(500).json({
        success: false,
        error: {
          code: 'USER_DELETE_ERROR',
          message: '删除用户失败'
        }
      });
    }
  }
);

export default router;