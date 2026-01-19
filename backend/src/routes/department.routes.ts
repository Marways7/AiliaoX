/**
 * 科室管理API路由
 *
 * 端点：
 * - GET /api/v1/departments - 获取科室列表
 * - GET /api/v1/departments/:id - 获取科室详情
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取所有科室列表
 * GET /api/v1/departments
 * 权限：需要认证（所有已登录用户均可访问）
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  async (_req: Request, res: Response) => {
    try {
      const departments = await prisma.department.findMany({
        select: {
          id: true,
          departmentNo: true,
          name: true,
          description: true,
          location: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          departmentNo: 'asc',
        },
      });

      return res.json({
        success: true,
        data: departments,
      });
    } catch (error) {
      logger.error('获取科室列表失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DEPARTMENT001',
          message: error instanceof Error ? error.message : '获取科室列表失败',
        },
      });
    }
  }
);

/**
 * 获取科室详情
 * GET /api/v1/departments/:id
 * 权限：需要认证
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          doctors: {
            select: {
              id: true,
              doctorNo: true,
              name: true,
              title: true,
              specialization: true,
              yearsOfExperience: true,
              consultationFee: true,
            },
          },
        },
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DEPARTMENT_NOT_FOUND',
            message: '科室不存在',
          },
        });
      }

      return res.json({
        success: true,
        data: department,
      });
    } catch (error) {
      logger.error('获取科室详情失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DEPARTMENT002',
          message: error instanceof Error ? error.message : '获取科室详情失败',
        },
      });
    }
  }
);

export default router;
