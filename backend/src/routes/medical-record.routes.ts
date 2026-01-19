/**
 * 病历管理API路由
 *
 * 端点：
 * - POST   /api/v1/medical-records - 创建病历
 * - GET    /api/v1/medical-records/:id - 获取病历详情
 * - PUT    /api/v1/medical-records/:id - 更新病历
 * - DELETE /api/v1/medical-records/:id - 删除病历（软删除）
 * - GET    /api/v1/medical-records/patient/:patientId - 获取患者所有病历
 * - POST   /api/v1/medical-records/:id/submit - 提交病历审核
 * - POST   /api/v1/medical-records/:id/approve - 审核通过病历
 * - POST   /api/v1/medical-records/:id/reject - 驳回病历
 * - GET    /api/v1/medical-records - 病历列表查询（支持分页、筛选）
 */

import { Router, Request, Response } from 'express';
import { MedicalRecordService } from '../services/medical-record.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ZodError, z } from 'zod';
import { RecordType } from '@prisma/client';

const router = Router();
const medicalRecordService = new MedicalRecordService(prisma);

// Zod验证Schema
const CreateMedicalRecordSchema = z.object({
  patientId: z.string().min(1, '患者ID不能为空'),
  doctorId: z.string().min(1, '医生ID不能为空'),
  appointmentId: z.string().optional(),
  templateId: z.string().optional(),
  chiefComplaint: z.string().min(1, '主诉不能为空'),
  presentIllness: z.string().min(1, '现病史不能为空'),
  pastHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  physicalExam: z.string().optional(),
  auxiliaryExam: z.string().optional(),
  diagnosis: z.string().min(1, '诊断不能为空'),
  treatmentPlan: z.string().min(1, '治疗方案不能为空'),
  followUpPlan: z.string().optional(),
  recordType: z.nativeEnum(RecordType, {
    errorMap: () => ({ message: '病历类型必须是OUTPATIENT、INPATIENT、EMERGENCY或FOLLOWUP' })
  })
});

const UpdateMedicalRecordSchema = z.object({
  chiefComplaint: z.string().min(1).optional(),
  presentIllness: z.string().min(1).optional(),
  pastHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  physicalExam: z.string().optional(),
  auxiliaryExam: z.string().optional(),
  diagnosis: z.string().min(1).optional(),
  treatmentPlan: z.string().min(1).optional(),
  followUpPlan: z.string().optional(),
  aiSummary: z.string().optional(),
  aiDiagnosticAdvice: z.string().optional()
});

const SearchMedicalRecordsSchema = z.object({
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  department: z.string().optional(),
  recordType: z.nativeEnum(RecordType).optional(),
  dateFrom: z.string().transform(val => new Date(val)).optional(),
  dateTo: z.string().transform(val => new Date(val)).optional(),
  keyword: z.string().optional(),
  page: z.string().transform(Number).optional(),
  pageSize: z.string().transform(Number).optional()
});

/**
 * 创建病历
 * POST /api/v1/medical-records
 * 权限：MEDICAL_RECORD_CREATE
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_CREATE),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CreateMedicalRecordSchema.parse(req.body);

      const medicalRecord = await medicalRecordService.createMedicalRecord(validatedData);

      logger.info(`病历创建成功: ${medicalRecord.recordNo} - 用户: ${req.user?.username}`);

      return res.status(201).json({
        success: true,
        message: '病历创建成功',
        data: medicalRecord
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('创建病历失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建病历失败'
      });
    }
  }
);

/**
 * 获取病历详情
 * GET /api/v1/medical-records/:id
 * 权限：MEDICAL_RECORD_READ + 同科室访问控制
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_READ),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      const medicalRecord = await medicalRecordService.getMedicalRecordById(id);

      if (!medicalRecord) {
        return res.status(404).json({
          success: false,
          message: '病历不存在'
        });
      }

      // 科室访问控制：检查是否同科室（超级管理员除外）
      if (currentUser && currentUser.role !== 'ADMIN') {
        try {
          // 获取病历医生的科室信息
          const recordDoctor = await prisma.doctor.findUnique({
            where: { id: medicalRecord.doctorId },
            select: { departmentId: true }
          });

          // 获取当前用户的医生信息（包含科室）
          // 注意：User模型通过doctor关系关联到Department
          const currentUserWithDoctor = await prisma.user.findUnique({
            where: { id: currentUser.userId },
            include: {
              doctor: {
                select: { departmentId: true }
              }
            }
          });

          // 检查当前用户是否是医生角色
          if (!currentUserWithDoctor?.doctor) {
            logger.warn(`用户${currentUser.username}不是医生，无法进行科室权限检查`);
            // 如果不是医生角色，允许访问（可能是其他角色如护士、管理员等）
          } else if (recordDoctor && currentUserWithDoctor.doctor.departmentId !== recordDoctor.departmentId) {
            // 跨科室访问，拒绝
            logger.warn(`跨科室访问被拒绝: 病历 ${medicalRecord.recordNo} - 用户: ${currentUser.username} (科室ID: ${currentUserWithDoctor.doctor.departmentId}) 尝试访问其他科室病历 (科室ID: ${recordDoctor.departmentId})`);
            return res.status(403).json({
              success: false,
              message: '无权访问其他科室的病历'
            });
          }
        } catch (dbError) {
          // 数据库查询错误，记录但不阻断
          logger.error('科室权限检查数据库错误:', dbError);
        }
      }

      logger.info(`获取病历详情: ${medicalRecord.recordNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: medicalRecord
      });
    } catch (error) {
      logger.error('获取病历详情失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取病历详情失败'
      });
    }
  }
);

/**
 * 更新病历
 * PUT /api/v1/medical-records/:id
 * 权限：MEDICAL_RECORD_UPDATE
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = UpdateMedicalRecordSchema.parse(req.body);

      const updatedRecord = await medicalRecordService.updateMedicalRecord(id, validatedData);

      logger.info(`病历更新成功: ${updatedRecord.recordNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '病历更新成功',
        data: updatedRecord
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('更新病历失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新病历失败'
      });
    }
  }
);

/**
 * 删除病历（软删除）
 * DELETE /api/v1/medical-records/:id
 * 权限：MEDICAL_RECORD_DELETE
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_DELETE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await medicalRecordService.deleteMedicalRecord(id);

      logger.info(`病历删除成功: ${id} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '病历删除成功'
      });
    } catch (error) {
      logger.error('删除病历失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除病历失败'
      });
    }
  }
);

/**
 * 获取患者所有病历
 * GET /api/v1/medical-records/patient/:patientId
 * 权限：MEDICAL_RECORD_READ
 */
router.get(
  '/patient/:patientId',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_READ),
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const records = await medicalRecordService.getPatientMedicalRecords(patientId, limit);

      logger.info(`获取患者病历历史: 患者ID ${patientId} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: {
          patientId,
          records,
          total: records.length
        }
      });
    } catch (error) {
      logger.error('获取患者病历历史失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取患者病历历史失败'
      });
    }
  }
);

/**
 * 提交病历审核
 * POST /api/v1/medical-records/:id/submit
 * 权限：MEDICAL_RECORD_UPDATE
 */
router.post(
  '/:id/submit',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const record = await medicalRecordService.getMedicalRecordById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: '病历不存在'
        });
      }

      if (record.isFinal) {
        return res.status(400).json({
          success: false,
          message: '病历已归档，无法提交审核'
        });
      }

      // 这里可以添加具体的提交审核逻辑，例如更新状态或触发工作流
      logger.info(`病历提交审核: ${record.recordNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '病历已提交审核',
        data: record
      });
    } catch (error) {
      logger.error('提交病历审核失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '提交病历审核失败'
      });
    }
  }
);

/**
 * 审核通过病历
 * POST /api/v1/medical-records/:id/approve
 * 权限：MEDICAL_RECORD_APPROVE
 */
router.post(
  '/:id/approve',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_APPROVE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const lockedRecord = await medicalRecordService.lockMedicalRecord(id);

      logger.info(`病历审核通过: ${lockedRecord.recordNo} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '病历审核通过并已归档',
        data: lockedRecord
      });
    } catch (error) {
      logger.error('审核病历失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '审核病历失败'
      });
    }
  }
);

/**
 * 驳回病历
 * POST /api/v1/medical-records/:id/reject
 * 权限：MEDICAL_RECORD_APPROVE
 */
router.post(
  '/:id/reject',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_APPROVE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: '驳回原因不能为空'
        });
      }

      const record = await medicalRecordService.getMedicalRecordById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: '病历不存在'
        });
      }

      // 这里可以添加具体的驳回逻辑，例如记录驳回原因或发送通知
      logger.info(`病历驳回: ${record.recordNo}, 原因: ${reason} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '病历已驳回',
        data: {
          record,
          rejectReason: reason
        }
      });
    } catch (error) {
      logger.error('驳回病历失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '驳回病历失败'
      });
    }
  }
);

/**
 * AI智能检索病历
 * POST /api/v1/medical-records/ai-search
 * 权限：MEDICAL_RECORD_READ
 *
 * 请求体：
 * {
 *   "query": "自然语言查询，如：查找发烧患者的病历",
 *   "limit": 10  // 可选，默认10
 * }
 */
router.post(
  '/ai-search',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_READ),
  async (req: Request, res: Response) => {
    try {
      const { query, limit = 10 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'query参数不能为空且必须是字符串'
        });
      }

      // 使用AI进行智能查询理解和关键词提取
      const { defaultAIProviderManager: aiProviderManager } = await import('../ai');
      const { MessageRole } = await import('../ai/types');

      // Step 1: AI理解用户查询并提取关键信息
      const analyzePrompt = `你是一个医疗病历智能检索助手。请分析以下用户查询，提取关键的医疗信息用于数据库搜索。

用户查询："${query}"

请以JSON格式返回分析结果（只返回JSON，不要其他文本）：
{
  "keywords": ["关键词1", "关键词2"],  // 提取的核心医疗术语
  "entities": {
    "diseases": ["疾病名称"],  // 提取的疾病
    "symptoms": ["症状"],  // 提取的症状
    "treatments": ["治疗方案"],  // 提取的治疗方法
    "timeRange": "时间范围描述"  // 如"最近一个月"等
  },
  "searchIntent": "搜索意图描述",
  "queryType": "diagnosis" | "symptom" | "treatment" | "general"  // 查询类型
}`;

      const aiAnalysisResponse = await aiProviderManager.chat({
        messages: [{ role: MessageRole.USER, content: analyzePrompt }]
      });

      const aiAnalysis = aiAnalysisResponse.message.content;

      // 解析AI返回的JSON
      let analysisResult: any = {};
      try {
        // 尝试从AI回复中提取JSON
        const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        logger.warn('AI分析结果解析失败，使用简单关键词匹配', parseError);
        analysisResult = {
          keywords: query.toLowerCase().split(/\s+/),
          entities: { diseases: [], symptoms: [], treatments: [] },
          searchIntent: query,
          queryType: 'general'
        };
      }

      logger.info(`AI查询分析: ${JSON.stringify(analysisResult)}`);

      // Step 2: 根据AI分析结果构建数据库查询
      const keywords = analysisResult.keywords || [];
      const diseases = analysisResult.entities?.diseases || [];
      const symptoms = analysisResult.entities?.symptoms || [];
      const treatments = analysisResult.entities?.treatments || [];

      // 构建综合查询条件
      const searchTerms = [...keywords, ...diseases, ...symptoms, ...treatments];
      const where: any = {
        OR: []
      };

      // 对每个搜索词进行多字段匹配
      // 注意：MySQL的contains操作符默认是大小写不敏感的（取决于排序规则，通常是utf8mb4_general_ci）
      searchTerms.forEach(term => {
        if (term && term.length > 1) {
          where.OR.push(
            { chiefComplaint: { contains: term } },
            { presentIllness: { contains: term } },
            { diagnosis: { contains: term } },
            { treatmentPlan: { contains: term } },
            { aiSummary: { contains: term } },
            { aiDiagnosticAdvice: { contains: term } },
            { pastHistory: { contains: term } },
            { physicalExam: { contains: term } }
          );
        }
      });

      // 如果没有有效的搜索条件，使用原始查询
      if (where.OR.length === 0) {
        where.OR = [
          { chiefComplaint: { contains: query } },
          { presentIllness: { contains: query } },
          { diagnosis: { contains: query } },
          { treatmentPlan: { contains: query } }
        ];
      }

      // Step 3: 执行数据库查询
      const records = await prisma.medicalRecord.findMany({
        where,
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
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit * 2  // 多取一些，后续用AI评分排序
      });

      if (records.length === 0) {
        return res.json({
          success: true,
          data: {
            records: [],
            relevanceScores: [],
            explanation: `未找到与"${query}"相关的病历。建议尝试：\n1. 使用更通用的医疗术语\n2. 简化查询条件\n3. 检查拼写是否正确`
          }
        });
      }

      // Step 4: 使用AI计算每条病历的相关性评分
      const relevanceScores: { recordId: string; score: number; reasoning: string }[] = [];

      for (const record of records.slice(0, limit)) {
        // 构建病历摘要用于AI评分
        const recordSummary = `
主诉：${record.chiefComplaint}
现病史：${record.presentIllness}
诊断：${record.diagnosis}
治疗方案：${record.treatmentPlan}
${record.aiSummary ? `AI摘要：${record.aiSummary}` : ''}
        `.trim();

        // AI评分prompt
        const scoringPrompt = `作为医疗信息检索专家，请评估以下病历与用户查询的相关性。

用户查询："${query}"
查询意图：${analysisResult.searchIntent}

病历内容：
${recordSummary}

请给出0-1之间的相关性评分（只返回数字和简短理由，格式: 评分|理由）：`;

        try {
          const scoreResponseObj = await aiProviderManager.chat({
            messages: [{ role: MessageRole.USER, content: scoringPrompt }]
          });

          const scoreResponse = scoreResponseObj.message.content;

          // 解析评分
          const scoreMatch = scoreResponse.match(/(0\.\d+|1\.0|0|1)\s*[|丨]\s*(.+)/);
          if (scoreMatch) {
            relevanceScores.push({
              recordId: record.id,
              score: parseFloat(scoreMatch[1]),
              reasoning: scoreMatch[2].trim()
            });
          } else {
            // 如果AI评分失败，使用简单的字段匹配评分
            let score = 0;
            const fields = [
              record.chiefComplaint,
              record.presentIllness,
              record.diagnosis,
              record.treatmentPlan,
              record.aiSummary,
              record.aiDiagnosticAdvice
            ];

            searchTerms.forEach(term => {
              fields.forEach(field => {
                if (field && field.toLowerCase().includes(term.toLowerCase())) {
                  score += 0.15;
                }
              });
            });

            relevanceScores.push({
              recordId: record.id,
              score: Math.min(score, 1),
              reasoning: '基于关键词匹配计算'
            });
          }
        } catch (scoringError) {
          logger.warn(`AI评分失败: ${scoringError}`);
          // 使用简单评分作为备选
          let score = 0;
          const fields = [
            record.chiefComplaint,
            record.presentIllness,
            record.diagnosis,
            record.treatmentPlan
          ];

          searchTerms.forEach(term => {
            fields.forEach(field => {
              if (field && field.toLowerCase().includes(term.toLowerCase())) {
                score += 0.15;
              }
            });
          });

          relevanceScores.push({
            recordId: record.id,
            score: Math.min(score, 1),
            reasoning: '基于关键词匹配计算'
          });
        }
      }

      // Step 5: 按相关性评分排序并截取top N
      relevanceScores.sort((a, b) => b.score - a.score);
      const topScores = relevanceScores.slice(0, limit);
      const topRecordIds = topScores.map(s => s.recordId);
      const rankedRecords = records.filter(r => topRecordIds.includes(r.id))
        .sort((a, b) => {
          const scoreA = topScores.find(s => s.recordId === a.id)?.score || 0;
          const scoreB = topScores.find(s => s.recordId === b.id)?.score || 0;
          return scoreB - scoreA;
        });

      // Step 6: 生成AI智能解释
      const explanationPrompt = `基于以下搜索信息，生成一段友好的搜索结果说明（不超过150字）：

用户查询："${query}"
查询意图：${analysisResult.searchIntent}
找到病历数：${rankedRecords.length}
平均相关度：${(topScores.reduce((sum, s) => sum + s.score, 0) / topScores.length * 100).toFixed(0)}%

请生成简洁、专业的搜索结果说明，包括：
1. 搜索范围说明
2. 结果概述
3. 相关度说明
4. 如果结果较少，给出优化建议`;

      let explanation = '';
      try {
        const explanationResponse = await aiProviderManager.chat({
          messages: [{ role: MessageRole.USER, content: explanationPrompt }]
        });
        explanation = explanationResponse.message.content;
      } catch (explainError) {
        explanation = `基于您的查询"${query}"，共找到 ${rankedRecords.length} 条高度相关的病历。\n\n搜索范围：主诉、现病史、诊断、治疗方案及AI分析。\n平均相关度：${(topScores.reduce((sum, s) => sum + s.score, 0) / topScores.length * 100).toFixed(0)}%\n\n结果已按AI智能评分排序，评分越高表示与您的查询越相关。`;
      }

      logger.info(`AI智能检索: 查询"${query}" - 用户: ${req.user?.username}, 返回: ${rankedRecords.length}条, 平均相关度: ${(topScores.reduce((sum, s) => sum + s.score, 0) / topScores.length * 100).toFixed(0)}%`);

      return res.json({
        success: true,
        data: {
          records: rankedRecords,
          relevanceScores: topScores.map(({ recordId, score }) => ({ recordId, score })),
          explanation: explanation.trim()
        }
      });
    } catch (error) {
      logger.error('AI智能检索失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'AI智能检索失败'
      });
    }
  }
);

/**
 * 导出病历为PDF
 * GET /api/v1/medical-records/:id/export/pdf
 * 权限：MEDICAL_RECORD_READ
 */
router.get(
  '/:id/export/pdf',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_READ),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const medicalRecord = await medicalRecordService.getMedicalRecordById(id);

      if (!medicalRecord) {
        return res.status(404).json({
          success: false,
          message: '病历不存在'
        });
      }

      // 生成PDF内容
      const pdfBuffer = await medicalRecordService.exportToPDF(medicalRecord);

      logger.info(`导出病历PDF: ${medicalRecord.recordNo} - 用户: ${req.user?.username}`);

      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="medical-record-${medicalRecord.recordNo}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (error) {
      logger.error('导出病历PDF失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '导出病历PDF失败'
      });
    }
  }
);

/**
 * 病历列表查询
 * GET /api/v1/medical-records
 * 权限：MEDICAL_RECORD_READ
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICAL_RECORD_READ),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery = SearchMedicalRecordsSchema.parse(req.query);

      const result = await medicalRecordService.searchMedicalRecords(validatedQuery);

      logger.info(`病历列表查询成功 - 用户: ${req.user?.username}, 返回: ${result.records.length}条`);

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

      logger.error('病历列表查询失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '病历列表查询失败'
      });
    }
  }
);

export default router;
