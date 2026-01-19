/**
 * 病历模板管理API路由
 *
 * 端点：
 * - POST   /api/v1/record-templates - 创建模板
 * - GET    /api/v1/record-templates/:id - 获取模板详情
 * - PUT    /api/v1/record-templates/:id - 更新模板
 * - DELETE /api/v1/record-templates/:id - 删除模板
 * - GET    /api/v1/record-templates - 模板列表查询
 * - GET    /api/v1/record-templates/popular - 获取常用模板
 * - GET    /api/v1/record-templates/statistics/overview - 模板统计信息
 */

import { Router, Request, Response } from 'express';
import { RecordTemplateService } from '../services/record-template.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ZodError, z } from 'zod';

const router = Router();
const recordTemplateService = new RecordTemplateService(prisma);

// Zod验证Schema
const TemplateContentSchema = z.object({
  chiefComplaint: z.string().optional(),
  presentIllness: z.string().optional(),
  pastHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  physicalExam: z.string().optional(),
  auxiliaryExam: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpPlan: z.string().optional()
});

const CreateRecordTemplateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空'),
  category: z.string().min(1, '模板分类不能为空'),
  content: TemplateContentSchema,
  fields: z.any().optional()
});

const UpdateRecordTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  content: TemplateContentSchema.optional(),
  fields: z.any().optional()
});

const SearchRecordTemplatesSchema = z.object({
  category: z.string().optional(),
  keyword: z.string().optional(),
  page: z.string().transform(Number).optional(),
  pageSize: z.string().transform(Number).optional()
});

/**
 * 创建病历模板
 * POST /api/v1/record-templates
 * 权限：RECORD_TEMPLATE_CREATE
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.RECORD_TEMPLATE_CREATE),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CreateRecordTemplateSchema.parse(req.body);

      const template = await recordTemplateService.createRecordTemplate(validatedData);

      logger.info(`病历模板创建成功: ${template.name} - 用户: ${req.user?.username}`);

      return res.status(201).json({
        success: true,
        message: '病历模板创建成功',
        data: template
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('创建病历模板失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建病历模板失败'
      });
    }
  }
);

/**
 * 获取病历模板详情
 * GET /api/v1/record-templates/:id
 * 权限：RECORD_TEMPLATE_READ
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.RECORD_TEMPLATE_READ),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const template = await recordTemplateService.getRecordTemplateById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: '病历模板不存在'
        });
      }

      logger.info(`获取病历模板详情: ${template.name} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('获取病历模板详情失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取病历模板详情失败'
      });
    }
  }
);

/**
 * 更新病历模板
 * PUT /api/v1/record-templates/:id
 * 权限：RECORD_TEMPLATE_UPDATE
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.RECORD_TEMPLATE_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = UpdateRecordTemplateSchema.parse(req.body);

      const updatedTemplate = await recordTemplateService.updateRecordTemplate(id, validatedData);

      logger.info(`病历模板更新成功: ${updatedTemplate.name} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '病历模板更新成功',
        data: updatedTemplate
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('更新病历模板失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新病历模板失败'
      });
    }
  }
);

/**
 * 删除病历模板
 * DELETE /api/v1/record-templates/:id
 * 权限：RECORD_TEMPLATE_DELETE
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.RECORD_TEMPLATE_DELETE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await recordTemplateService.deleteRecordTemplate(id);

      logger.info(`病历模板删除成功: ${id} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '病历模板删除成功'
      });
    } catch (error) {
      logger.error('删除病历模板失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除病历模板失败'
      });
    }
  }
);

/**
 * 模板列表查询
 * GET /api/v1/record-templates
 * 权限：RECORD_TEMPLATE_READ
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.RECORD_TEMPLATE_READ),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery = SearchRecordTemplatesSchema.parse(req.query);

      const result = await recordTemplateService.searchRecordTemplates(validatedQuery);

      logger.info(`模板列表查询成功 - 用户: ${req.user?.username}, 返回: ${result.templates.length}条`);

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

      logger.error('模板列表查询失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '模板列表查询失败'
      });
    }
  }
);

/**
 * 获取常用模板
 * GET /api/v1/record-templates/popular
 * 权限：RECORD_TEMPLATE_READ
 */
router.get(
  '/popular',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.RECORD_TEMPLATE_READ),
  async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const templates = await recordTemplateService.getPopularTemplates(limit);

      logger.info(`获取常用模板成功 - 用户: ${req.user?.username}, 返回: ${templates.length}条`);

      return res.json({
        success: true,
        data: {
          templates,
          total: templates.length
        }
      });
    } catch (error) {
      logger.error('获取常用模板失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取常用模板失败'
      });
    }
  }
);

/**
 * 模板统计信息
 * GET /api/v1/record-templates/statistics/overview
 * 权限：RECORD_TEMPLATE_READ
 */
router.get(
  '/statistics/overview',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.RECORD_TEMPLATE_READ),
  async (req: Request, res: Response) => {
    try {
      const statistics = await recordTemplateService.getTemplateStatistics();

      logger.info(`模板统计信息查询成功 - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('模板统计信息查询失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '模板统计信息查询失败'
      });
    }
  }
);

export default router;
