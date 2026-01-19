/**
 * AI智能辅助API路由
 *
 * 端点：
 * - POST /api/v1/ai-assistant/diagnose - AI智能问诊
 * - POST /api/v1/ai-assistant/analyze-patient - 患者数据智能分析
 * - POST /api/v1/ai-assistant/quick-record - 病历快速录入辅助
 * - POST /api/v1/ai-assistant/medical-qa - 医疗知识问答
 * - GET /api/v1/ai-assistant/suggestions/:patientId - 获取患者治疗建议
 * - POST /api/v1/ai-assistant/check-drug-interaction - AI药物相互作用检查
 * - POST /api/v1/ai-assistant/check-contraindication - AI禁忌症检查
 * - POST /api/v1/ai-assistant/check-dosage - AI剂量合理性检查
 * - POST /api/v1/ai-assistant/review-prescription - AI处方智能审核
 * - POST /api/v1/ai-assistant/suggest-alternative - AI替代药物建议
 * - POST /api/v1/ai-assistant/medical-record/summarize - AI病历智能总结
 * - POST /api/v1/ai-assistant/medical-record/quality-check - AI病历质量检查
 * - POST /api/v1/ai-assistant/diagnosis/suggest - AI诊断建议生成
 * - POST /api/v1/ai-assistant/treatment/suggest - AI治疗方案建议
 * - POST /api/v1/ai-assistant/medical-records/search - AI病历智能检索
 */

import { Router, Request, Response } from 'express';
import { AIAssistantService } from '../services/ai-assistant.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { defaultAIProviderManager } from '../ai';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import {
  DiagnoseSchema,
  PatientAnalysisSchema,
  QuickRecordSchema,
  MedicalQASchema
} from '../validation/schemas';
import { ZodError } from 'zod';

const router = Router();

// 创建AI辅助服务实例
const aiAssistantService = new AIAssistantService(defaultAIProviderManager, prisma);

/**
 * AI智能问诊
 * POST /api/v1/ai-assistant/diagnose
 * 权限：需要认证
 */
router.post(
  '/diagnose',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      // 验证输入
      const validatedData = DiagnoseSchema.parse(req.body);

      // 调用AI问诊服务
      const diagnoseResult = await aiAssistantService.diagnose(validatedData);

      logger.info(`AI问诊完成 - 用户: ${req.user?.username}, 症状: ${validatedData.symptoms.join(', ')}`);

      return res.json({
        success: true,
        data: diagnoseResult
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

      logger.error('AI问诊失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI001',
          message: error instanceof Error ? error.message : 'AI问诊服务异常'
        }
      });
    }
  }
);

/**
 * 患者数据智能分析
 * POST /api/v1/ai-assistant/analyze-patient
 * 权限：需要认证
 */
router.post(
  '/analyze-patient',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      // 验证输入
      const validatedData = PatientAnalysisSchema.parse(req.body);

      // 调用患者分析服务
      const analysisResult = await aiAssistantService.analyzePatient(validatedData);

      logger.info(
        `患者分析完成 - 用户: ${req.user?.username}, 患者ID: ${validatedData.patientId}, 分析类型: ${validatedData.analysisType}`
      );

      return res.json({
        success: true,
        data: analysisResult
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

      logger.error('患者分析失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI002',
          message: error instanceof Error ? error.message : '患者分析服务异常'
        }
      });
    }
  }
);

/**
 * 病历快速录入辅助
 * POST /api/v1/ai-assistant/quick-record
 * 权限：需要认证
 */
router.post(
  '/quick-record',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      // 验证输入
      const validatedData = QuickRecordSchema.parse(req.body);

      // 调用病历录入辅助服务
      const recordResult = await aiAssistantService.quickRecord(validatedData);

      logger.info(
        `病历快速录入完成 - 用户: ${req.user?.username}, 主诉: ${validatedData.chiefComplaint.slice(0, 50)}...`
      );

      return res.json({
        success: true,
        data: recordResult
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

      logger.error('病历快速录入失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI003',
          message: error instanceof Error ? error.message : '病历录入辅助服务异常'
        }
      });
    }
  }
);

/**
 * 医疗知识问答
 * POST /api/v1/ai-assistant/medical-qa
 * 权限：需要认证
 */
router.post(
  '/medical-qa',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      // 验证输入
      const validatedData = MedicalQASchema.parse(req.body);

      // 调用医疗知识问答服务
      const answer = await aiAssistantService.medicalQA(validatedData);

      logger.info(
        `医疗知识问答完成 - 用户: ${req.user?.username}, 问题: ${validatedData.question.slice(0, 50)}...`
      );

      return res.json({
        success: true,
        data: {
          question: validatedData.question,
          answer,
          professionalLevel: validatedData.professionalLevel,
          timestamp: new Date().toISOString()
        }
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

      logger.error('医疗知识问答失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI004',
          message: error instanceof Error ? error.message : '医疗知识问答服务异常'
        }
      });
    }
  }
);

/**
 * 获取患者治疗建议
 * GET /api/v1/ai-assistant/suggestions/:patientId
 * 权限：需要认证
 */
router.get(
  '/suggestions/:patientId',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;

      // 验证patientId是UUID格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(patientId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '患者ID格式无效'
          }
        });
      }

      // 获取治疗建议
      const suggestions = await aiAssistantService.getPatientTreatmentSuggestions(patientId);

      logger.info(`获取患者治疗建议完成 - 用户: ${req.user?.username}, 患者ID: ${patientId}`);

      return res.json({
        success: true,
        data: {
          patientId,
          suggestions,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('获取治疗建议失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI005',
          message: error instanceof Error ? error.message : '获取治疗建议服务异常'
        }
      });
    }
  }
);

/**
 * AI药物相互作用检查
 * POST /api/v1/ai-assistant/check-drug-interaction
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/check-drug-interaction',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { medicines } = req.body;

      if (!Array.isArray(medicines) || medicines.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '至少需要2种药物进行相互作用检查'
          }
        });
      }

      // 验证每个药物对象
      for (const medicine of medicines) {
        if (!medicine.name || !medicine.dosage) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '药物信息不完整，需要提供name和dosage'
            }
          });
        }
      }

      const result = await aiAssistantService.checkDrugInteraction(medicines);

      logger.info(`AI药物相互作用检查完成 - 用户: ${req.user?.username}, 药物数: ${medicines.length}`);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AI药物相互作用检查失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI006',
          message: error instanceof Error ? error.message : 'AI药物相互作用检查服务异常'
        }
      });
    }
  }
);

/**
 * AI禁忌症检查
 * POST /api/v1/ai-assistant/check-contraindication
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/check-contraindication',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { medicines, patientInfo } = req.body;

      if (!Array.isArray(medicines) || medicines.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '至少需要1种药物进行禁忌症检查'
          }
        });
      }

      if (!patientInfo || !patientInfo.age || !patientInfo.gender) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '患者信息不完整，至少需要age和gender'
          }
        });
      }

      const result = await aiAssistantService.checkContraindication({ medicines, patientInfo });

      logger.info(`AI禁忌症检查完成 - 用户: ${req.user?.username}, 药物数: ${medicines.length}`);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AI禁忌症检查失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI007',
          message: error instanceof Error ? error.message : 'AI禁忌症检查服务异常'
        }
      });
    }
  }
);

/**
 * AI剂量合理性检查
 * POST /api/v1/ai-assistant/check-dosage
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/check-dosage',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { medicine, dosage, frequency, patientInfo } = req.body;

      if (!medicine || !dosage || !frequency) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '药物、剂量、频次信息不能为空'
          }
        });
      }

      if (!patientInfo || !patientInfo.age || !patientInfo.gender) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '患者信息不完整，至少需要age和gender'
          }
        });
      }

      const result = await aiAssistantService.checkDosage({ medicine, dosage, frequency, patientInfo });

      logger.info(`AI剂量检查完成 - 用户: ${req.user?.username}, 药物: ${medicine}`);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AI剂量检查失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI008',
          message: error instanceof Error ? error.message : 'AI剂量检查服务异常'
        }
      });
    }
  }
);

/**
 * AI处方智能审核
 * POST /api/v1/ai-assistant/review-prescription
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/review-prescription',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { diagnosis, medicines, patientInfo } = req.body;

      if (!diagnosis || !Array.isArray(medicines) || medicines.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '诊断和药物列表不能为空'
          }
        });
      }

      if (!patientInfo || !patientInfo.age || !patientInfo.gender) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '患者信息不完整，至少需要age和gender'
          }
        });
      }

      // 验证每个药物对象
      for (const medicine of medicines) {
        if (!medicine.name || !medicine.dosage || !medicine.frequency || !medicine.duration) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '药物信息不完整，需要提供name、dosage、frequency、duration'
            }
          });
        }
      }

      const result = await aiAssistantService.reviewPrescription({ diagnosis, medicines, patientInfo });

      logger.info(`AI处方审核完成 - 用户: ${req.user?.username}, 药物数: ${medicines.length}`);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AI处方审核失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI009',
          message: error instanceof Error ? error.message : 'AI处方审核服务异常'
        }
      });
    }
  }
);

/**
 * AI替代药物建议
 * POST /api/v1/ai-assistant/suggest-alternative
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/suggest-alternative',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { originalMedicine, reason, indication, patientInfo } = req.body;

      if (!originalMedicine || !reason || !indication) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '原药物、替代原因、适应症不能为空'
          }
        });
      }

      const result = await aiAssistantService.suggestAlternative({
        originalMedicine,
        reason,
        indication,
        patientInfo
      });

      logger.info(`AI替代药物建议完成 - 用户: ${req.user?.username}, 原药物: ${originalMedicine}`);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AI替代药物建议失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI010',
          message: error instanceof Error ? error.message : 'AI替代药物建议服务异常'
        }
      });
    }
  }
);

/**
 * AI病历智能总结
 * POST /api/v1/ai-assistant/medical-record/summarize
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/medical-record/summarize',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.AI_REVIEW_USE),
  async (req: Request, res: Response) => {
    try {
      const {
        chiefComplaint,
        presentIllness,
        pastHistory,
        physicalExam,
        diagnosis,
        treatmentPlan
      } = req.body;

      if (!chiefComplaint || !presentIllness || !diagnosis || !treatmentPlan) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '主诉、现病史、诊断、治疗方案不能为空'
          }
        });
      }

      const summary = await aiAssistantService.summarizeMedicalRecord({
        chiefComplaint,
        presentIllness,
        pastHistory,
        physicalExam,
        diagnosis,
        treatmentPlan
      });

      logger.info(`AI病历总结完成 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: {
          summary,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('AI病历总结失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI011',
          message: error instanceof Error ? error.message : 'AI病历总结服务异常'
        }
      });
    }
  }
);

/**
 * AI病历质量检查
 * POST /api/v1/ai-assistant/medical-record/quality-check
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/medical-record/quality-check',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.AI_REVIEW_USE),
  async (req: Request, res: Response) => {
    try {
      const {
        chiefComplaint,
        presentIllness,
        pastHistory,
        familyHistory,
        physicalExam,
        auxiliaryExam,
        diagnosis,
        treatmentPlan
      } = req.body;

      if (!chiefComplaint || !presentIllness || !diagnosis || !treatmentPlan) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '主诉、现病史、诊断、治疗方案不能为空'
          }
        });
      }

      const qualityReport = await aiAssistantService.checkMedicalRecordQuality({
        chiefComplaint,
        presentIllness,
        pastHistory,
        familyHistory,
        physicalExam,
        auxiliaryExam,
        diagnosis,
        treatmentPlan
      });

      logger.info(`AI病历质量检查完成 - 用户: ${req.user?.username}, 总分: ${qualityReport.overallScore}`);

      return res.json({
        success: true,
        data: qualityReport
      });
    } catch (error) {
      logger.error('AI病历质量检查失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI012',
          message: error instanceof Error ? error.message : 'AI病历质量检查服务异常'
        }
      });
    }
  }
);

/**
 * AI诊断建议生成
 * POST /api/v1/ai-assistant/diagnosis/suggest
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/diagnosis/suggest',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.AI_REVIEW_USE),
  async (req: Request, res: Response) => {
    try {
      const { chiefComplaint, symptoms, physicalExam, auxiliaryExam, patientInfo } = req.body;

      if (!chiefComplaint || !symptoms) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '主诉和症状描述不能为空'
          }
        });
      }

      const suggestions = await aiAssistantService.generateDiagnosisSuggestion({
        chiefComplaint,
        symptoms,
        physicalExam,
        auxiliaryExam,
        patientInfo
      });

      logger.info(`AI诊断建议生成完成 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      logger.error('AI诊断建议生成失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI013',
          message: error instanceof Error ? error.message : 'AI诊断建议服务异常'
        }
      });
    }
  }
);

/**
 * AI治疗方案建议
 * POST /api/v1/ai-assistant/treatment/suggest
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/treatment/suggest',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.AI_REVIEW_USE),
  async (req: Request, res: Response) => {
    try {
      const { diagnosis, symptoms, patientInfo } = req.body;

      if (!diagnosis || !symptoms || !patientInfo) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '诊断、症状和患者信息不能为空'
          }
        });
      }

      if (!patientInfo.age || !patientInfo.gender) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '患者年龄和性别不能为空'
          }
        });
      }

      const treatmentPlan = await aiAssistantService.generateTreatmentSuggestion({
        diagnosis,
        symptoms,
        patientInfo
      });

      logger.info(`AI治疗方案建议完成 - 用户: ${req.user?.username}, 诊断: ${diagnosis}`);

      return res.json({
        success: true,
        data: treatmentPlan
      });
    } catch (error) {
      logger.error('AI治疗方案建议失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI014',
          message: error instanceof Error ? error.message : 'AI治疗方案建议服务异常'
        }
      });
    }
  }
);

/**
 * AI病历智能检索
 * POST /api/v1/ai-assistant/medical-records/search
 * 权限：需要认证 + AI_REVIEW_USE
 */
router.post(
  '/medical-records/search',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.AI_REVIEW_USE),
  async (req: Request, res: Response) => {
    try {
      const { query, patientId, dateRange, limit } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '搜索查询不能为空'
          }
        });
      }

      const searchResult = await aiAssistantService.searchMedicalRecords({
        query,
        patientId,
        dateRange,
        limit
      });

      logger.info(`AI病历检索完成 - 用户: ${req.user?.username}, 查询: ${query}, 结果数: ${searchResult.results.length}`);

      return res.json({
        success: true,
        data: searchResult
      });
    } catch (error) {
      logger.error('AI病历检索失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI015',
          message: error instanceof Error ? error.message : 'AI病历检索服务异常'
        }
      });
    }
  }
);

/**
 * 生成病历智能摘要(根据病历ID)
 * POST /api/v1/ai-assistant/record-summary/:recordId
 * 权限：需要认证
 */
router.post(
  '/record-summary/:recordId',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { recordId } = req.params;

      // 获取病历详情
      const record = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        include: {
          patient: true,
          doctor: true
        }
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '病历不存在'
          }
        });
      }

      // 调用AI生成摘要
      const summary = await aiAssistantService.summarizeMedicalRecord({
        chiefComplaint: record.chiefComplaint,
        presentIllness: record.presentIllness,
        pastHistory: record.pastHistory || '',
        physicalExam: record.physicalExam || '',
        diagnosis: record.diagnosis,
        treatmentPlan: record.treatmentPlan
      });

      logger.info(`AI病历摘要生成完成 - 用户: ${req.user?.username}, 病历ID: ${recordId}`);

      return res.json({
        success: true,
        data: {
          summary,
          keyPoints: [],
          timeline: []
        }
      });
    } catch (error) {
      logger.error('AI病历摘要生成失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI016',
          message: error instanceof Error ? error.message : 'AI病历摘要服务异常'
        }
      });
    }
  }
);

/**
 * 获取诊断建议(根据病历ID)
 * POST /api/v1/ai-assistant/diagnosis-suggestions/:recordId
 * 权限：需要认证
 */
router.post(
  '/diagnosis-suggestions/:recordId',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { recordId } = req.params;

      // 获取病历详情
      const record = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        include: {
          patient: true,
          doctor: true
        }
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '病历不存在'
          }
        });
      }

      // 计算患者年龄
      const birthDate = record.patient.birthDate ? new Date(record.patient.birthDate) : null;
      const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

      // 调用AI生成诊断建议
      const suggestions = await aiAssistantService.generateDiagnosisSuggestion({
        chiefComplaint: record.chiefComplaint,
        symptoms: record.presentIllness,
        physicalExam: record.physicalExam || '',
        auxiliaryExam: record.auxiliaryExam || '',
        patientInfo: {
          age,
          gender: record.patient.gender,
          medicalHistory: (record.patient as any).allergies || ''  // 使用类型断言处理allergies字段
        }
      });

      // 转换为前端期待的格式
      const primaryDiagnosis = suggestions.suggestedDiagnoses.map(d => d.diagnosis);
      const differentialDiagnosis = suggestions.differentialDiagnoses || [];
      const recommendedTests = suggestions.recommendedTests || [];
      const reasoning = suggestions.notes || suggestions.suggestedDiagnoses.map(d => d.reasoning).join('\n\n');

      logger.info(`AI诊断建议生成完成 - 用户: ${req.user?.username}, 病历ID: ${recordId}`);

      return res.json({
        success: true,
        data: {
          primaryDiagnosis,
          differentialDiagnosis,
          recommendedTests,
          reasoning
        }
      });
    } catch (error) {
      logger.error('AI诊断建议生成失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI017',
          message: error instanceof Error ? error.message : 'AI诊断建议服务异常'
        }
      });
    }
  }
);

/**
 * 获取病历版本历史
 * GET /api/v1/ai-assistant/medical-record-versions/:recordId
 * 权限：需要认证
 */
router.get(
  '/medical-record-versions/:recordId',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { recordId } = req.params;

      // 查询病历的所有版本（通过version字段）
      const record = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        include: {
          doctor: {
            include: {
              department: true
            }
          }
        }
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '病历不存在'
          }
        });
      }

      // 返回当前版本信息（简化实现，实际应该有完整的版本历史表）
      const versions = [{
        id: record.id,
        version: record.version,
        status: record.isFinal ? 'ARCHIVED' : 'DRAFT',
        doctorName: record.doctor?.name || '',
        department: record.doctor?.department?.name || '',
        updatedAt: record.updatedAt
      }];

      logger.info(`获取病历版本历史完成 - 用户: ${req.user?.username}, 病历ID: ${recordId}`);

      return res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      logger.error('获取病历版本历史失败:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI018',
          message: error instanceof Error ? error.message : '获取版本历史服务异常'
        }
      });
    }
  }
);

export default router;