/**
 * 患者信息管理API路由
 *
 * 端点：
 * - POST /api/v1/patients - 创建患者
 * - GET /api/v1/patients - 获取患者列表（分页、搜索、筛选）
 * - GET /api/v1/patients/:id - 获取患者详情
 * - PUT /api/v1/patients/:id - 更新患者信息
 * - DELETE /api/v1/patients/:id - 删除患者（软删除）
 * - GET /api/v1/patients/:id/records - 获取患者病历历史
 * - GET /api/v1/patients/:id/statistics - 获取患者统计信息
 * - POST /api/v1/patients/:id/tags - 添加患者标签
 * - DELETE /api/v1/patients/:id/tags/:tag - 删除患者标签
 * - GET /api/v1/patients/statistics/global - 获取全局患者统计
 */

import { Router, Request, Response } from 'express';
import { PatientService } from '../services/patient.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import {
  CreatePatientSchema,
  UpdatePatientSchema,
  PatientSearchSchema,
  AddPatientTagSchema
} from '../validation/schemas';
import { ZodError } from 'zod';

const router = Router();
const patientService = new PatientService(prisma);

/**
 * 创建患者
 * POST /api/v1/patients
 * 权限：PATIENT_CREATE
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_CREATE),
  async (req: Request, res: Response) => {
    try {
      // 验证输入
      const validatedData = CreatePatientSchema.parse(req.body);

      // 转换birthDate为Date对象
      const patientData = {
        ...validatedData,
        birthDate: new Date(validatedData.birthDate)
      };

      // 创建患者
      const patient = await patientService.createPatient(patientData);

      logger.info(`患者创建成功 - 用户: ${req.user?.username}, 患者: ${patient.patientNo}`);

      return res.status(201).json({
        success: true,
        data: patient
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

      logger.error('创建患者失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT001',
          message: error instanceof Error ? error.message : '创建患者失败'
        }
      });
    }
  }
);

/**
 * 获取患者列表（分页、搜索、筛选）
 * GET /api/v1/patients
 * 权限：PATIENT_VIEW
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      // 验证查询参数
      const validatedParams = PatientSearchSchema.parse(req.query);

      // 搜索患者
      const result = await patientService.searchPatients(validatedParams);

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

      logger.error('获取患者列表失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT002',
          message: error instanceof Error ? error.message : '获取患者列表失败'
        }
      });
    }
  }
);

/**
 * 获取患者详情
 * GET /api/v1/patients/:id
 * 权限：PATIENT_VIEW
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const patient = await patientService.getPatientById(id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: '患者不存在'
          }
        });
      }

      return res.json({
        success: true,
        data: patient
      });
    } catch (error) {
      logger.error('获取患者详情失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT003',
          message: error instanceof Error ? error.message : '获取患者详情失败'
        }
      });
    }
  }
);

/**
 * 更新患者信息
 * PUT /api/v1/patients/:id
 * 权限：PATIENT_UPDATE
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 验证输入
      const validatedData = UpdatePatientSchema.parse(req.body);

      // 转换birthDate为Date对象（如果提供）
      const updateData: any = { ...validatedData };
      if (validatedData.birthDate) {
        updateData.birthDate = new Date(validatedData.birthDate);
      }

      // 更新患者
      const patient = await patientService.updatePatient(id, updateData);

      logger.info(`患者更新成功 - 用户: ${req.user?.username}, 患者: ${patient.patientNo}`);

      return res.json({
        success: true,
        data: patient
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

      logger.error('更新患者失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT004',
          message: error instanceof Error ? error.message : '更新患者失败'
        }
      });
    }
  }
);

/**
 * 删除患者（软删除）
 * DELETE /api/v1/patients/:id
 * 权限：PATIENT_DELETE
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_DELETE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await patientService.deletePatient(id);

      logger.info(`患者删除成功 - 用户: ${req.user?.username}, 患者ID: ${id}`);

      return res.json({
        success: true,
        message: '患者已删除'
      });
    } catch (error) {
      logger.error('删除患者失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT005',
          message: error instanceof Error ? error.message : '删除患者失败'
        }
      });
    }
  }
);

/**
 * 获取患者病历历史
 * GET /api/v1/patients/:id/records
 * 权限：PATIENT_VIEW
 */
router.get(
  '/:id/records',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const records = await patientService.getPatientMedicalRecords(id, limit);

      return res.json({
        success: true,
        data: records
      });
    } catch (error) {
      logger.error('获取患者病历历史失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT006',
          message: error instanceof Error ? error.message : '获取病历历史失败'
        }
      });
    }
  }
);

/**
 * 获取患者统计信息
 * GET /api/v1/patients/:id/statistics
 * 权限：PATIENT_VIEW
 */
router.get(
  '/:id/statistics',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const statistics = await patientService.getPatientStatistics(id);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取患者统计信息失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT007',
          message: error instanceof Error ? error.message : '获取统计信息失败'
        }
      });
    }
  }
);

/**
 * 添加患者标签
 * POST /api/v1/patients/:id/tags
 * 权限：PATIENT_UPDATE
 */
router.post(
  '/:id/tags',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 验证输入
      const validatedData = AddPatientTagSchema.parse(req.body);

      const tag = await patientService.addPatientTag(id, validatedData.tag, validatedData.color);

      logger.info(`患者标签添加成功 - 用户: ${req.user?.username}, 患者ID: ${id}, 标签: ${validatedData.tag}`);

      return res.status(201).json({
        success: true,
        data: tag
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

      logger.error('添加患者标签失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT008',
          message: error instanceof Error ? error.message : '添加标签失败'
        }
      });
    }
  }
);

/**
 * 删除患者标签
 * DELETE /api/v1/patients/:id/tags/:tag
 * 权限：PATIENT_UPDATE
 */
router.delete(
  '/:id/tags/:tag',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id, tag } = req.params;

      await patientService.removePatientTag(id, tag);

      logger.info(`患者标签删除成功 - 用户: ${req.user?.username}, 患者ID: ${id}, 标签: ${tag}`);

      return res.json({
        success: true,
        message: '标签已删除'
      });
    } catch (error) {
      logger.error('删除患者标签失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT009',
          message: error instanceof Error ? error.message : '删除标签失败'
        }
      });
    }
  }
);

/**
 * 获取全局患者统计
 * GET /api/v1/patients/statistics/global
 * 权限：PATIENT_VIEW
 */
router.get(
  '/statistics/global',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.PATIENT_VIEW),
  async (_req: Request, res: Response) => {
    try {
      const statistics = await patientService.getGlobalStatistics();

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取全局统计失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PATIENT010',
          message: error instanceof Error ? error.message : '获取全局统计失败'
        }
      });
    }
  }
);

export default router;