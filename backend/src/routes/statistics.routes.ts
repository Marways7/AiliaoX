/**
 * 统计数据API路由 - 里程碑7
 *
 * 端点：
 * - GET /api/v1/statistics/dashboard - 获取Dashboard综合统计
 * - GET /api/v1/statistics/patients - 获取患者统计
 * - GET /api/v1/statistics/doctors - 获取医生统计
 * - GET /api/v1/statistics/departments - 获取科室统计
 * - GET /api/v1/statistics/appointments - 获取挂号统计
 * - GET /api/v1/statistics/prescriptions - 获取处方统计
 * - GET /api/v1/statistics/medical-records - 获取病历统计
 */

import { Router, Request, Response } from 'express';
import { StatisticsService, StatisticsTimeRange, CustomTimeRangeRequest } from '../services/statistics.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();
const statisticsService = new StatisticsService(prisma);

/**
 * 获取Dashboard综合统计数据
 * GET /api/v1/statistics/dashboard
 * 权限：STATISTICS_VIEW
 */
router.get(
  '/dashboard',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.STATISTICS_VIEW),
  async (req: Request, res: Response) => {
    try {
      const data = await statisticsService.getDashboardStatistics();

      logger.info(`获取Dashboard统计成功 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('获取Dashboard统计失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取Dashboard统计失败'
      });
    }
  }
);

/**
 * 获取患者统计数据
 * GET /api/v1/statistics/patients
 * Query参数：
 * - timeRange: TODAY | WEEK | MONTH | QUARTER | YEAR | CUSTOM
 * - startDate: 自定义开始日期（CUSTOM时必填）
 * - endDate: 自定义结束日期（CUSTOM时必填）
 * 权限：STATISTICS_VIEW
 */
router.get(
  '/patients',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.STATISTICS_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { timeRange = 'MONTH', startDate, endDate } = req.query;

      let customRange: CustomTimeRangeRequest | undefined;
      if (timeRange === 'CUSTOM') {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'CUSTOM时间范围需要提供startDate和endDate'
          });
        }
        customRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const data = await statisticsService.getPatientStatistics(
        timeRange as StatisticsTimeRange,
        customRange
      );

      logger.info(`获取患者统计成功 - 用户: ${req.user?.username}, 时间范围: ${timeRange}`);

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('获取患者统计失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取患者统计失败'
      });
    }
  }
);

/**
 * 获取医生统计数据
 * GET /api/v1/statistics/doctors
 * 权限：STATISTICS_VIEW
 */
router.get(
  '/doctors',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.STATISTICS_VIEW),
  async (req: Request, res: Response) => {
    try {
      const data = await statisticsService.getDoctorStatistics();

      logger.info(`获取医生统计成功 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('获取医生统计失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取医生统计失败'
      });
    }
  }
);

/**
 * 获取科室统计数据
 * GET /api/v1/statistics/departments
 * 权限：STATISTICS_VIEW
 */
router.get(
  '/departments',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.STATISTICS_VIEW),
  async (req: Request, res: Response) => {
    try {
      const data = await statisticsService.getDepartmentStatistics();

      logger.info(`获取科室统计成功 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('获取科室统计失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取科室统计失败'
      });
    }
  }
);

/**
 * 获取挂号统计数据
 * GET /api/v1/statistics/appointments
 * Query参数：
 * - timeRange: TODAY | WEEK | MONTH | QUARTER | YEAR | CUSTOM
 * - startDate: 自定义开始日期（CUSTOM时必填）
 * - endDate: 自定义结束日期（CUSTOM时必填）
 * 权限：STATISTICS_VIEW
 */
router.get(
  '/appointments',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.STATISTICS_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { timeRange = 'MONTH', startDate, endDate } = req.query;

      let customRange: CustomTimeRangeRequest | undefined;
      if (timeRange === 'CUSTOM') {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'CUSTOM时间范围需要提供startDate和endDate'
          });
        }
        customRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const data = await statisticsService.getAppointmentStatistics(
        timeRange as StatisticsTimeRange,
        customRange
      );

      logger.info(`获取挂号统计成功 - 用户: ${req.user?.username}, 时间范围: ${timeRange}`);

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('获取挂号统计失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取挂号统计失败'
      });
    }
  }
);

/**
 * 获取处方统计数据
 * GET /api/v1/statistics/prescriptions
 * Query参数：
 * - timeRange: TODAY | WEEK | MONTH | QUARTER | YEAR | CUSTOM
 * - startDate: 自定义开始日期（CUSTOM时必填）
 * - endDate: 自定义结束日期（CUSTOM时必填）
 * 权限：STATISTICS_VIEW
 */
router.get(
  '/prescriptions',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.STATISTICS_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { timeRange = 'MONTH', startDate, endDate } = req.query;

      let customRange: CustomTimeRangeRequest | undefined;
      if (timeRange === 'CUSTOM') {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'CUSTOM时间范围需要提供startDate和endDate'
          });
        }
        customRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const data = await statisticsService.getPrescriptionStatistics(
        timeRange as StatisticsTimeRange,
        customRange
      );

      logger.info(`获取处方统计成功 - 用户: ${req.user?.username}, 时间范围: ${timeRange}`);

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('获取处方统计失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取处方统计失败'
      });
    }
  }
);

/**
 * 获取病历统计数据
 * GET /api/v1/statistics/medical-records
 * Query参数：
 * - timeRange: TODAY | WEEK | MONTH | QUARTER | YEAR | CUSTOM
 * - startDate: 自定义开始日期（CUSTOM时必填）
 * - endDate: 自定义结束日期（CUSTOM时必填）
 * 权限：STATISTICS_VIEW
 */
router.get(
  '/medical-records',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.STATISTICS_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { timeRange = 'MONTH', startDate, endDate } = req.query;

      let customRange: CustomTimeRangeRequest | undefined;
      if (timeRange === 'CUSTOM') {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'CUSTOM时间范围需要提供startDate和endDate'
          });
        }
        customRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const data = await statisticsService.getMedicalRecordStatistics(
        timeRange as StatisticsTimeRange,
        customRange
      );

      logger.info(`获取病历统计成功 - 用户: ${req.user?.username}, 时间范围: ${timeRange}`);

      return res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('获取病历统计失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取病历统计失败'
      });
    }
  }
);

export default router;
