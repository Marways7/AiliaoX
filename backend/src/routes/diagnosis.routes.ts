/**
 * 诊断管理API路由
 *
 * 端点：
 * - POST   /api/v1/diagnoses - 创建诊断（添加到病历）
 * - GET    /api/v1/diagnoses/:id - 获取诊断详情
 * - PUT    /api/v1/diagnoses/:id - 更新诊断
 * - DELETE /api/v1/diagnoses/:id - 删除诊断
 * - GET    /api/v1/diagnoses/patient/:patientId - 获取患者诊断历史
 * - GET    /api/v1/diagnoses - 诊断列表查询
 * - GET    /api/v1/diagnoses/statistics/common - 常见诊断统计
 * - GET    /api/v1/diagnoses/statistics/overview - 诊断统计概览
 * - GET    /api/v1/diagnoses/icd10/:code - 根据ICD-10编码查询诊断信息
 */

import { Router, Request, Response } from 'express';
import { DiagnosisService } from '../services/diagnosis.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ZodError, z } from 'zod';

const router = Router();
const diagnosisService = new DiagnosisService(prisma);

// Zod验证Schema
const DiagnosisInfoSchema = z.object({
  icd10Code: z.string().optional(),
  diagnosisName: z.string().min(1, '诊断名称不能为空'),
  diagnosisType: z.enum(['primary', 'secondary', 'differential']),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  notes: z.string().optional()
});

const CreateDiagnosisSchema = z.object({
  medicalRecordId: z.string().min(1, '病历ID不能为空'),
  diagnoses: z.array(DiagnosisInfoSchema).min(1, '至少需要一个诊断')
});

const SearchDiagnosisSchema = z.object({
  keyword: z.string().optional(),
  icd10Code: z.string().optional(),
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  dateFrom: z.string().transform(val => new Date(val)).optional(),
  dateTo: z.string().transform(val => new Date(val)).optional(),
  page: z.string().transform(Number).optional(),
  pageSize: z.string().transform(Number).optional()
});

const CommonDiagnosesQuerySchema = z.object({
  doctorId: z.string().optional(),
  dateFrom: z.string().transform(val => new Date(val)).optional(),
  dateTo: z.string().transform(val => new Date(val)).optional(),
  limit: z.string().transform(Number).optional()
});

/**
 * 创建诊断（添加到病历）
 * POST /api/v1/diagnoses
 * 权限：DIAGNOSIS_CREATE
 *
 * 注意：由于Prisma schema中诊断信息存储在MedicalRecord的diagnosis字段中，
 * 这个端点主要用于记录和验证诊断信息
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_CREATE),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CreateDiagnosisSchema.parse(req.body);

      // 验证病历是否存在
      const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { id: validatedData.medicalRecordId }
      });

      if (!medicalRecord) {
        return res.status(404).json({
          success: false,
          message: '病历不存在'
        });
      }

      // 将诊断信息格式化为文本（实际项目中可能需要JSON字段存储）
      const diagnosisText = validatedData.diagnoses
        .map(d => {
          let text = `${d.diagnosisName}`;
          if (d.icd10Code) text += ` (ICD-10: ${d.icd10Code})`;
          if (d.diagnosisType) text += ` [${d.diagnosisType}]`;
          if (d.severity) text += ` - 严重程度: ${d.severity}`;
          if (d.notes) text += ` - 备注: ${d.notes}`;
          return text;
        })
        .join('; ');

      logger.info(`诊断信息创建: 病历ID ${validatedData.medicalRecordId} - 用户: ${req.user?.username}`);

      return res.status(201).json({
        success: true,
        message: '诊断信息创建成功',
        data: {
          medicalRecordId: validatedData.medicalRecordId,
          diagnoses: validatedData.diagnoses,
          diagnosisText
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('创建诊断失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建诊断失败'
      });
    }
  }
);

/**
 * 获取诊断详情（从病历中获取）
 * GET /api/v1/diagnoses/:id
 * 权限：DIAGNOSIS_READ
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_READ),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 这里的id是病历ID
      const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientNo: true,
              name: true,
              gender: true,
              birthDate: true
            }
          },
          doctor: {
            select: {
              id: true,
              doctorNo: true,
              name: true,
              title: true,
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (!medicalRecord) {
        return res.status(404).json({
          success: false,
          message: '诊断记录不存在'
        });
      }

      logger.info(`获取诊断详情: ${medicalRecord.recordNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: {
          id: medicalRecord.id,
          recordNo: medicalRecord.recordNo,
          diagnosis: medicalRecord.diagnosis,
          diagnosisDate: medicalRecord.createdAt,
          patient: medicalRecord.patient,
          doctor: medicalRecord.doctor
        }
      });
    } catch (error) {
      logger.error('获取诊断详情失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取诊断详情失败'
      });
    }
  }
);

/**
 * 更新诊断
 * PUT /api/v1/diagnoses/:id
 * 权限：DIAGNOSIS_UPDATE
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { diagnosis } = req.body;

      if (!diagnosis) {
        return res.status(400).json({
          success: false,
          message: '诊断内容不能为空'
        });
      }

      // 更新病历中的诊断信息
      const updatedRecord = await prisma.medicalRecord.update({
        where: { id },
        data: {
          diagnosis,
          updatedAt: new Date()
        }
      });

      logger.info(`诊断更新成功: ${updatedRecord.recordNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '诊断更新成功',
        data: {
          id: updatedRecord.id,
          recordNo: updatedRecord.recordNo,
          diagnosis: updatedRecord.diagnosis
        }
      });
    } catch (error) {
      logger.error('更新诊断失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新诊断失败'
      });
    }
  }
);

/**
 * 删除诊断
 * DELETE /api/v1/diagnoses/:id
 * 权限：DIAGNOSIS_DELETE
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_DELETE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 清空病历中的诊断信息
      const updatedRecord = await prisma.medicalRecord.update({
        where: { id },
        data: {
          diagnosis: '',
          updatedAt: new Date()
        }
      });

      logger.info(`诊断删除成功: ${updatedRecord.recordNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '诊断删除成功'
      });
    } catch (error) {
      logger.error('删除诊断失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除诊断失败'
      });
    }
  }
);

/**
 * 获取患者诊断历史
 * GET /api/v1/diagnoses/patient/:patientId
 * 权限：DIAGNOSIS_READ
 */
router.get(
  '/patient/:patientId',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_READ),
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const diagnosisHistory = await diagnosisService.getPatientDiagnosisHistory(patientId, limit);

      logger.info(`获取患者诊断历史: 患者ID ${patientId} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: {
          patientId,
          history: diagnosisHistory,
          total: diagnosisHistory.length
        }
      });
    } catch (error) {
      logger.error('获取患者诊断历史失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取患者诊断历史失败'
      });
    }
  }
);

/**
 * 诊断列表查询
 * GET /api/v1/diagnoses
 * 权限：DIAGNOSIS_READ
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_READ),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery = SearchDiagnosisSchema.parse(req.query);

      const result = await diagnosisService.searchDiagnoses(validatedQuery);

      logger.info(`诊断列表查询成功 - 用户: ${req.user?.username}, 返回: ${result.diagnoses.length}条`);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '查询参数验证失败',
          errors: error.errors
        });
      }

      logger.error('诊断列表查询失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '诊断列表查询失败'
      });
    }
  }
);

/**
 * 常见诊断统计
 * GET /api/v1/diagnoses/statistics/common
 * 权限：DIAGNOSIS_READ
 */
router.get(
  '/statistics/common',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_READ),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery = CommonDiagnosesQuerySchema.parse(req.query);

      const commonDiagnoses = await diagnosisService.getCommonDiagnoses(validatedQuery);

      logger.info(`常见诊断统计查询成功 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: {
          commonDiagnoses,
          total: commonDiagnoses.length
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

      logger.error('常见诊断统计查询失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '常见诊断统计查询失败'
      });
    }
  }
);

/**
 * 诊断统计概览
 * GET /api/v1/diagnoses/statistics/overview
 * 权限：DIAGNOSIS_READ
 */
router.get(
  '/statistics/overview',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_READ),
  async (req: Request, res: Response) => {
    try {
      const options: any = {};

      if (req.query.doctorId) {
        options.doctorId = req.query.doctorId as string;
      }

      if (req.query.dateFrom) {
        options.dateFrom = new Date(req.query.dateFrom as string);
      }

      if (req.query.dateTo) {
        options.dateTo = new Date(req.query.dateTo as string);
      }

      const statistics = await diagnosisService.getDiagnosisStatistics(options);

      logger.info(`诊断统计概览查询成功 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('诊断统计概览查询失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '诊断统计概览查询失败'
      });
    }
  }
);

/**
 * 根据ICD-10编码查询诊断信息
 * GET /api/v1/diagnoses/icd10/:code
 * 权限：DIAGNOSIS_READ
 */
router.get(
  '/icd10/:code',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DIAGNOSIS_READ),
  async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      const icd10Info = await diagnosisService.getByICD10Code(code);

      logger.info(`ICD-10编码查询: ${code} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: icd10Info
      });
    } catch (error) {
      logger.error('ICD-10编码查询失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'ICD-10编码查询失败'
      });
    }
  }
);

export default router;
