/**
 * 排队管理API路由
 *
 * 端点：
 * - POST /api/v1/queue - 创建排队
 * - GET /api/v1/queue/:id - 获取排队详情
 * - GET /api/v1/queue/number/:queueNumber - 根据排队号码获取详情
 * - GET /api/v1/queue/department/:departmentId - 获取科室排队列表
 * - GET /api/v1/queue/doctor/:doctorId - 获取医生排队列表
 * - POST /api/v1/queue/call-next - 叫号
 * - PUT /api/v1/queue/:id/complete - 完成就诊
 * - DELETE /api/v1/queue/:id - 取消排队
 * - GET /api/v1/queue/:id/position - 获取排队位置
 * - GET /api/v1/queue/department/:departmentId/statistics - 获取科室排队统计
 */

import { Router, Request, Response } from 'express';
import { QueueService } from '../services/queue.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { CreateQueueSchema } from '../validation/schemas';
import { ZodError } from 'zod';

const router = Router();
const queueService = new QueueService(prisma);

/**
 * 创建排队
 * POST /api/v1/queue
 * 权限：QUEUE_CREATE
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_CREATE),
  async (req: Request, res: Response) => {
    try {
      // 验证输入
      const validatedData = CreateQueueSchema.parse(req.body);

      // 创建排队
      const queue = await queueService.createQueue(validatedData);

      logger.info(
        `排队创建成功 - 用户: ${req.user?.username}, 排队号码: ${queue.queueNumber}`
      );

      return res.status(201).json({
        success: true,
        data: queue
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '输入验证失败',
            details: error.errors
          }
        });
      }

      logger.error('创建排队失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE001',
          message: error instanceof Error ? error.message : '创建排队失败'
        }
      });
    }
  }
);

/**
 * 获取排队详情
 * GET /api/v1/queue/:id
 * 权限：QUEUE_VIEW
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const queue = await queueService.getQueueById(id);

      if (!queue) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QUEUE_NOT_FOUND',
            message: '排队记录不存在'
          }
        });
      }

      return res.json({
        success: true,
        data: queue
      });
    } catch (error) {
      logger.error('获取排队详情失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE002',
          message: error instanceof Error ? error.message : '获取排队详情失败'
        }
      });
    }
  }
);

/**
 * 根据排队号码获取详情
 * GET /api/v1/queue/number/:queueNumber
 * 权限：QUEUE_VIEW
 */
router.get(
  '/number/:queueNumber',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { queueNumber } = req.params;

      const queue = await queueService.getQueueByNumber(parseInt(queueNumber));

      if (!queue) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QUEUE_NOT_FOUND',
            message: '排队记录不存在'
          }
        });
      }

      return res.json({
        success: true,
        data: queue
      });
    } catch (error) {
      logger.error('获取排队详情失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE003',
          message: error instanceof Error ? error.message : '获取排队详情失败'
        }
      });
    }
  }
);

/**
 * 获取科室排队列表
 * GET /api/v1/queue/department/:departmentId
 * 权限：QUEUE_VIEW
 */
router.get(
  '/department/:departmentId',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;

      const queues = await queueService.getDepartmentQueue(departmentId);

      return res.json({
        success: true,
        data: queues
      });
    } catch (error) {
      logger.error('获取科室排队列表失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE004',
          message: error instanceof Error ? error.message : '获取科室排队列表失败'
        }
      });
    }
  }
);

/**
 * 获取医生排队列表
 * GET /api/v1/queue/doctor/:doctorId
 * 权限：QUEUE_VIEW
 */
router.get(
  '/doctor/:doctorId',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { doctorId } = req.params;

      const queues = await queueService.getDoctorQueue(doctorId);

      return res.json({
        success: true,
        data: queues
      });
    } catch (error) {
      logger.error('获取医生排队列表失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE005',
          message: error instanceof Error ? error.message : '获取医生排队列表失败'
        }
      });
    }
  }
);

/**
 * 叫号
 * POST /api/v1/queue/call-next
 * 权限：QUEUE_CALL
 */
router.post(
  '/call-next',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_CALL),
  async (req: Request, res: Response) => {
    try {
      const { doctorId } = req.body;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必需参数: doctorId'
          }
        });
      }

      const queue = await queueService.callNext(doctorId);

      if (!queue) {
        return res.json({
          success: true,
          data: null,
          message: '当前没有等待的患者'
        });
      }

      logger.info(
        `叫号成功 - 用户: ${req.user?.username}, 排队号码: ${queue.queueNumber}`
      );

      return res.json({
        success: true,
        data: queue
      });
    } catch (error) {
      logger.error('叫号失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE006',
          message: error instanceof Error ? error.message : '叫号失败'
        }
      });
    }
  }
);

/**
 * 完成就诊
 * PUT /api/v1/queue/:id/complete
 * 权限：QUEUE_UPDATE
 */
router.put(
  '/:id/complete',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const queue = await queueService.completeConsultation(id);

      logger.info(
        `就诊完成 - 用户: ${req.user?.username}, 排队号码: ${queue.queueNumber}`
      );

      return res.json({
        success: true,
        data: queue
      });
    } catch (error) {
      logger.error('完成就诊失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE007',
          message: error instanceof Error ? error.message : '完成就诊失败'
        }
      });
    }
  }
);

/**
 * 取消排队
 * DELETE /api/v1/queue/:id
 * 权限：QUEUE_DELETE
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_DELETE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const queue = await queueService.cancelQueue(id);

      logger.info(
        `排队取消 - 用户: ${req.user?.username}, 排队号码: ${queue.queueNumber}`
      );

      return res.json({
        success: true,
        data: queue
      });
    } catch (error) {
      logger.error('取消排队失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE008',
          message: error instanceof Error ? error.message : '取消排队失败'
        }
      });
    }
  }
);

/**
 * 获取排队位置
 * GET /api/v1/queue/:id/position
 * 权限：QUEUE_VIEW
 */
router.get(
  '/:id/position',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const position = await queueService.getQueuePosition(id);

      return res.json({
        success: true,
        data: position
      });
    } catch (error) {
      logger.error('获取排队位置失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE009',
          message: error instanceof Error ? error.message : '获取排队位置失败'
        }
      });
    }
  }
);

/**
 * 获取科室排队统计
 * GET /api/v1/queue/department/:departmentId/statistics
 * 权限：QUEUE_VIEW
 */
router.get(
  '/department/:departmentId/statistics',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.QUEUE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;

      const statistics = await queueService.getDepartmentQueueStatistics(departmentId);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取科室排队统计失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE010',
          message: error instanceof Error ? error.message : '获取科室排队统计失败'
        }
      });
    }
  }
);

export default router;