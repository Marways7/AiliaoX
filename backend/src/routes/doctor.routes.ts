/**
 * 医生管理API路由
 *
 * 端点：
 * - GET /api/v1/doctors - 获取医生列表（支持按科室筛选）
 * - GET /api/v1/doctors/:id - 获取医生详情
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取医生列表
 * GET /api/v1/doctors?departmentId=xxx
 * 权限：需要认证（所有已登录用户均可访问）
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.query;

      const where: any = {};
      if (departmentId) {
        where.departmentId = departmentId as string;
      }

      const doctors = await prisma.doctor.findMany({
        where,
        select: {
          id: true,
          doctorNo: true,
          name: true,
          departmentId: true,
          title: true,
          specialization: true,
          qualification: true,
          yearsOfExperience: true,
          consultationFee: true,
          department: {
            select: {
              id: true,
              name: true,
              departmentNo: true,
            },
          },
        },
        orderBy: {
          doctorNo: 'asc',
        },
      });

      return res.json({
        success: true,
        data: doctors,
      });
    } catch (error) {
      logger.error('获取医生列表失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DOCTOR001',
          message: error instanceof Error ? error.message : '获取医生列表失败',
        },
      });
    }
  }
);

/**
 * 获取医生详情
 * GET /api/v1/doctors/:id
 * 权限：需要认证
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const doctor = await prisma.doctor.findUnique({
        where: { id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              departmentNo: true,
              location: true,
              phone: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCTOR_NOT_FOUND',
            message: '医生不存在',
          },
        });
      }

      return res.json({
        success: true,
        data: doctor,
      });
    } catch (error) {
      logger.error('获取医生详情失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DOCTOR002',
          message: error instanceof Error ? error.message : '获取医生详情失败',
        },
      });
    }
  }
);

export default router;
