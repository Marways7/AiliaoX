/**
 * 挂号管理API路由
 *
 * 端点：
 * - POST /api/v1/appointments - 创建挂号
 * - GET /api/v1/appointments - 获取挂号列表（支持搜索、筛选、分页）
 * - GET /api/v1/appointments/statistics - 获取挂号统计信息
 * - GET /api/v1/appointments/patient/:patientId/history - 获取患者挂号历史
 * - GET /api/v1/appointments/doctor/:doctorId - 获取医生挂号列表
 * - GET /api/v1/appointments/department/:departmentId/statistics - 获取科室挂号统计
 * - GET /api/v1/appointments/check-availability - 检查时间段可用性
 * - GET /api/v1/appointments/:id - 获取挂号详情
 * - PUT /api/v1/appointments/:id - 更新挂号信息
 * - DELETE /api/v1/appointments/:id - 取消挂号
 */

import { Router, Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { QueueService } from '../services/queue.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { TimeSlot } from '@prisma/client';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  AppointmentSearchSchema
} from '../validation/schemas';
import { ZodError } from 'zod';

const router = Router();
const appointmentService = new AppointmentService(prisma);
const queueService = new QueueService(prisma);

/**
 * 创建挂号
 * POST /api/v1/appointments
 * 权限：APPOINTMENT_CREATE
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_CREATE),
  async (req: Request, res: Response) => {
    try {
      // 验证输入
      const validatedData = CreateAppointmentSchema.parse(req.body);

      // 转换日期字符串为Date对象
      const appointmentData = {
        ...validatedData,
        appointmentDate: new Date(validatedData.appointmentDate)
      };

      // 创建挂号
      const appointment = await appointmentService.createAppointment(appointmentData);

      // 自动创建排队记录（不自动签到）
      await queueService.createQueue({
        appointmentId: appointment.id,
        autoCheckIn: false
      });

      logger.info(
        `挂号创建成功 - 用户: ${req.user?.username}, 挂号号码: ${appointment.appointmentNo}`
      );

      return res.status(201).json({
        success: true,
        data: appointment
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

      logger.error('创建挂号失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT001',
          message: error instanceof Error ? error.message : '创建挂号失败'
        }
      });
    }
  }
);

/**
 * 获取挂号列表（支持搜索、筛选、分页）
 * GET /api/v1/appointments
 * 权限：APPOINTMENT_VIEW
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      // 验证查询参数
      const validatedParams = AppointmentSearchSchema.parse(req.query);

      // 转换日期字符串为Date对象
      const searchParams: any = { ...validatedParams };
      if (validatedParams.dateFrom) {
        searchParams.dateFrom = new Date(validatedParams.dateFrom);
      }
      if (validatedParams.dateTo) {
        searchParams.dateTo = new Date(validatedParams.dateTo);
      }

      // 搜索挂号
      const result = await appointmentService.searchAppointments(searchParams);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '查询参数验证失败',
            details: error.errors
          }
        });
      }

      logger.error('获取挂号列表失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT002',
          message: error instanceof Error ? error.message : '获取挂号列表失败'
        }
      });
    }
  }
);

/**
 * 获取挂号统计信息（通用统计）
 * GET /api/v1/appointments/statistics
 * 权限：APPOINTMENT_VIEW
 * 注意：此路由必须在 /:id 路由之前，否则会被当作 id 参数处理
 */
router.get(
  '/statistics',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, department } = req.query;

      const statistics = await appointmentService.getOverallStatistics({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        department: department as string | undefined
      });

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取挂号统计信息失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT010',
          message: error instanceof Error ? error.message : '获取挂号统计信息失败'
        }
      });
    }
  }
);

/**
 * 获取患者挂号历史
 * GET /api/v1/appointments/patient/:patientId/history
 * 权限：APPOINTMENT_VIEW
 */
router.get(
  '/patient/:patientId/history',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const appointments = await appointmentService.getPatientAppointmentHistory(patientId, limit);

      return res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      logger.error('获取患者挂号历史失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT006',
          message: error instanceof Error ? error.message : '获取挂号历史失败'
        }
      });
    }
  }
);

/**
 * 获取医生挂号列表
 * GET /api/v1/appointments/doctor/:doctorId
 * 权限：APPOINTMENT_VIEW
 */
router.get(
  '/doctor/:doctorId',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { doctorId } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const status = req.query.status as any;

      const appointments = await appointmentService.getDoctorAppointments(doctorId, date, status);

      return res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      logger.error('获取医生挂号列表失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT007',
          message: error instanceof Error ? error.message : '获取医生挂号列表失败'
        }
      });
    }
  }
);

/**
 * 获取科室挂号统计
 * GET /api/v1/appointments/department/:departmentId/statistics
 * 权限：APPOINTMENT_VIEW
 */
router.get(
  '/department/:departmentId/statistics',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      const statistics = await appointmentService.getDepartmentStatistics(departmentId, date);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取科室挂号统计失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT008',
          message: error instanceof Error ? error.message : '获取科室挂号统计失败'
        }
      });
    }
  }
);

/**
 * 检查时间段可用性
 * GET /api/v1/appointments/check-availability
 * 权限：APPOINTMENT_VIEW
 */
router.get(
  '/check-availability',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { doctorId, appointmentDate, timeSlot } = req.query;

      if (!doctorId || !appointmentDate || !timeSlot) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必需参数: doctorId, appointmentDate, timeSlot'
          }
        });
      }

      const isAvailable = await appointmentService.checkTimeSlotAvailability(
        doctorId as string,
        new Date(appointmentDate as string),
        timeSlot as TimeSlot
      );

      return res.json({
        success: true,
        data: {
          available: isAvailable
        }
      });
    } catch (error) {
      logger.error('检查时间段可用性失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT009',
          message: error instanceof Error ? error.message : '检查时间段可用性失败'
        }
      });
    }
  }
);

/**
 * 获取挂号详情
 * GET /api/v1/appointments/:id
 * 权限：APPOINTMENT_VIEW
 * 注意：此路由必须放在所有特殊路径之后，因为它会匹配任何路径
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.getAppointmentById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'APPOINTMENT_NOT_FOUND',
            message: '挂号记录不存在'
          }
        });
      }

      return res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('获取挂号详情失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT003',
          message: error instanceof Error ? error.message : '获取挂号详情失败'
        }
      });
    }
  }
);

/**
 * 更新挂号信息
 * PUT /api/v1/appointments/:id
 * 权限：APPOINTMENT_UPDATE
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 验证输入
      const validatedData = UpdateAppointmentSchema.parse(req.body);

      // 转换日期字符串为Date对象（如果提供）
      const updateData: any = { ...validatedData };
      if (validatedData.actualVisitTime) {
        updateData.actualVisitTime = new Date(validatedData.actualVisitTime);
      }

      // 更新挂号
      const appointment = await appointmentService.updateAppointment(id, updateData);

      logger.info(
        `挂号更新成功 - 用户: ${req.user?.username}, 挂号号码: ${appointment.appointmentNo}`
      );

      return res.json({
        success: true,
        data: appointment
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

      logger.error('更新挂号失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT004',
          message: error instanceof Error ? error.message : '更新挂号失败'
        }
      });
    }
  }
);

/**
 * 取消挂号
 * DELETE /api/v1/appointments/:id
 * 权限：APPOINTMENT_UPDATE（取消是状态更新，不是删除）
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.APPOINTMENT_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.cancelAppointment(id);

      logger.info(
        `挂号取消成功 - 用户: ${req.user?.username}, 挂号号码: ${appointment.appointmentNo}`
      );

      return res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('取消挂号失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'APPOINTMENT005',
          message: error instanceof Error ? error.message : '取消挂号失败'
        }
      });
    }
  }
);

export default router;
