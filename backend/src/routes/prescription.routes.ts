/**
 * 处方管理API路由
 *
 * 端点：
 * - POST   /api/v1/prescriptions - 创建处方
 * - GET    /api/v1/prescriptions - 处方列表（分页、搜索、筛选）
 * - GET    /api/v1/prescriptions/:id - 获取处方详情
 * - PUT    /api/v1/prescriptions/:id - 更新处方
 * - DELETE /api/v1/prescriptions/:id - 取消处方
 * - POST   /api/v1/prescriptions/:id/approve - 审批处方
 * - POST   /api/v1/prescriptions/:id/dispense - 发药
 * - GET    /api/v1/prescriptions/:id/print - 获取处方打印数据
 * - GET    /api/v1/prescriptions/patient/:patientId - 患者处方历史
 * - GET    /api/v1/prescriptions/doctor/:doctorId/statistics - 医生处方统计
 * - GET    /api/v1/prescriptions/statistics/overview - 处方统计信息
 */

import { Router, Request, Response } from 'express';
import { PrescriptionService } from '../services/prescription.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ZodError, z } from 'zod';
import { PrescriptionStatus } from '@prisma/client';

const router = Router();
const prescriptionService = new PrescriptionService(prisma);

// Zod验证Schema
const PrescriptionItemSchema = z.object({
  medicineId: z.string().min(1, '药品ID不能为空'),
  dosage: z.string().min(1, '剂量不能为空'),
  frequency: z.string().min(1, '频次不能为空'),
  duration: z.string().min(1, '疗程不能为空'),
  quantity: z.number().int().positive('数量必须为正整数'),
  instructions: z.string().optional()
});

const CreatePrescriptionSchema = z.object({
  patientId: z.string().min(1, '患者ID不能为空'),
  doctorId: z.string().min(1, '医生ID不能为空'),
  diagnosis: z.string().min(1, '诊断不能为空'),
  notes: z.string().optional(),
  items: z.array(PrescriptionItemSchema).min(1, '至少需要一个药品')
});

const UpdatePrescriptionSchema = z.object({
  diagnosis: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(PrescriptionStatus).optional()
});

const PrescriptionSearchSchema = z.object({
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  status: z.nativeEnum(PrescriptionStatus).optional(),
  startDate: z.string().transform(val => new Date(val)).optional(),
  endDate: z.string().transform(val => new Date(val)).optional(),
  page: z.string().transform(Number).optional(),
  pageSize: z.string().transform(Number).optional()
});

/**
 * 创建处方
 * POST /api/v1/prescriptions
 * 权限：PRESCRIPTION_CREATE
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_CREATE),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CreatePrescriptionSchema.parse(req.body);

      const prescription = await prescriptionService.createPrescription(validatedData);

      logger.info(`处方创建成功: ${prescription.prescriptionNo} - 用户: ${req.user?.username}`);

      return res.status(201).json({
        success: true,
        message: '处方创建成功',
        data: prescription
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('创建处方失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建处方失败'
      });
    }
  }
);

/**
 * 获取处方列表（分页、搜索、筛选）
 * GET /api/v1/prescriptions
 * 权限：PRESCRIPTION_VIEW
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_VIEW),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery = PrescriptionSearchSchema.parse(req.query);

      const result = await prescriptionService.getPrescriptions(validatedQuery);

      return res.json({
        success: true,
        data: result.prescriptions,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: Math.ceil(result.total / result.pageSize)
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '查询参数验证失败',
          errors: error.errors
        });
      }

      logger.error('获取处方列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取处方列表失败'
      });
    }
  }
);

/**
 * 获取处方详情
 * GET /api/v1/prescriptions/:id
 * 权限：PRESCRIPTION_VIEW
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const prescription = await prescriptionService.getPrescriptionById(id);

      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: '处方不存在'
        });
      }

      return res.json({
        success: true,
        data: prescription
      });
    } catch (error) {
      logger.error('获取处方详情失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取处方详情失败'
      });
    }
  }
);

/**
 * 更新处方
 * PUT /api/v1/prescriptions/:id
 * 权限：PRESCRIPTION_UPDATE
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = UpdatePrescriptionSchema.parse(req.body);

      const prescription = await prescriptionService.updatePrescription(id, validatedData);

      logger.info(`处方更新成功: ${prescription.prescriptionNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '处方更新成功',
        data: prescription
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('更新处方失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新处方失败'
      });
    }
  }
);

/**
 * 取消处方
 * DELETE /api/v1/prescriptions/:id
 * 权限：PRESCRIPTION_CANCEL
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_CANCEL),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const prescription = await prescriptionService.cancelPrescription(id);

      logger.info(`处方取消成功: ${prescription.prescriptionNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '处方取消成功',
        data: prescription
      });
    } catch (error) {
      logger.error('取消处方失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '取消处方失败'
      });
    }
  }
);

/**
 * 审批处方
 * POST /api/v1/prescriptions/:id/approve
 * 权限：PRESCRIPTION_APPROVE
 */
router.post(
  '/:id/approve',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_APPROVE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const prescription = await prescriptionService.approvePrescription(id);

      logger.info(`处方审批成功: ${prescription.prescriptionNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '处方审批成功',
        data: prescription
      });
    } catch (error) {
      logger.error('审批处方失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '审批处方失败'
      });
    }
  }
);

/**
 * 发药
 * POST /api/v1/prescriptions/:id/dispense
 * 权限：PRESCRIPTION_DISPENSE
 */
router.post(
  '/:id/dispense',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_DISPENSE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const prescription = await prescriptionService.dispensePrescription(id);

      logger.info(`发药成功: ${prescription.prescriptionNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '发药成功',
        data: prescription
      });
    } catch (error) {
      logger.error('发药失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '发药失败'
      });
    }
  }
);

/**
 * 获取处方打印数据
 * GET /api/v1/prescriptions/:id/print
 * 权限：PRESCRIPTION_VIEW
 */
router.get(
  '/:id/print',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const printData = await prescriptionService.getPrescriptionPrintData(id);

      return res.json({
        success: true,
        data: printData
      });
    } catch (error) {
      logger.error('获取处方打印数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取处方打印数据失败'
      });
    }
  }
);

/**
 * 获取患者处方历史
 * GET /api/v1/prescriptions/patient/:patientId
 * 权限：PRESCRIPTION_VIEW
 */
router.get(
  '/patient/:patientId',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const { limit } = req.query;

      const limitNum = limit ? parseInt(limit as string, 10) : 10;

      const prescriptions = await prescriptionService.getPatientPrescriptions(patientId, limitNum);

      return res.json({
        success: true,
        data: prescriptions
      });
    } catch (error) {
      logger.error('获取患者处方历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取患者处方历史失败'
      });
    }
  }
);

/**
 * 获取医生处方统计
 * GET /api/v1/prescriptions/doctor/:doctorId/statistics
 * 权限：PRESCRIPTION_VIEW
 */
router.get(
  '/doctor/:doctorId/statistics',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { doctorId } = req.params;

      const statistics = await prescriptionService.getDoctorPrescriptionStats(doctorId);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取医生处方统计失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取医生处方统计失败'
      });
    }
  }
);

/**
 * 获取处方统计信息
 * GET /api/v1/prescriptions/statistics/overview
 * 权限：PRESCRIPTION_VIEW
 */
router.get(
  '/statistics/overview',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PRESCRIPTION_VIEW),
  async (_req: Request, res: Response) => {
    try {
      const statistics = await prescriptionService.getPrescriptionStatistics();

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取处方统计失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取处方统计失败'
      });
    }
  }
);

export default router;
