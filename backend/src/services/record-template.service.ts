/**
 * 病历模板管理服务
 *
 * 功能:
 * - 病历模板创建、更新、查询、删除
 * - 模板分类管理
 * - 常用模板收藏
 * - 模板使用统计
 */

import { PrismaClient, RecordTemplate } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateRecordTemplateRequest {
  name: string;
  category: string;
  content: {
    chiefComplaint?: string;
    presentIllness?: string;
    pastHistory?: string;
    familyHistory?: string;
    physicalExam?: string;
    auxiliaryExam?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    followUpPlan?: string;
  };
  fields?: any; // 动态字段定义
}

export interface UpdateRecordTemplateRequest {
  name?: string;
  category?: string;
  content?: {
    chiefComplaint?: string;
    presentIllness?: string;
    pastHistory?: string;
    familyHistory?: string;
    physicalExam?: string;
    auxiliaryExam?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    followUpPlan?: string;
  };
  fields?: any;
}

export interface SearchRecordTemplatesRequest {
  category?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 病历模板管理服务类
 */
export class RecordTemplateService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建病历模板
   */
  async createRecordTemplate(request: CreateRecordTemplateRequest): Promise<RecordTemplate> {
    try {
      const { name, category, content, fields } = request;

      // 创建模板
      const template = await this.prisma.recordTemplate.create({
        data: {
          name,
          category,
          content: JSON.stringify(content),
          fields: fields || {}
        }
      });

      logger.info(`病历模板创建成功 - 模板名称: ${name}`);
      return template;
    } catch (error) {
      logger.error('创建病历模板失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取病历模板
   */
  async getRecordTemplateById(id: string): Promise<RecordTemplate | null> {
    try {
      const template = await this.prisma.recordTemplate.findUnique({
        where: { id }
      });

      return template;
    } catch (error) {
      logger.error('获取病历模板失败:', error);
      throw error;
    }
  }

  /**
   * 更新病历模板
   */
  async updateRecordTemplate(id: string, request: UpdateRecordTemplateRequest): Promise<RecordTemplate> {
    try {
      // 检查模板是否存在
      const existingTemplate = await this.prisma.recordTemplate.findUnique({
        where: { id }
      });

      if (!existingTemplate) {
        throw new Error('病历模板不存在');
      }

      // 准备更新数据
      const updateData: any = {
        updatedAt: new Date()
      };

      if (request.name !== undefined) {
        updateData.name = request.name;
      }

      if (request.category !== undefined) {
        updateData.category = request.category;
      }

      if (request.content !== undefined) {
        updateData.content = JSON.stringify(request.content);
      }

      if (request.fields !== undefined) {
        updateData.fields = request.fields;
      }

      // 更新模板
      const updatedTemplate = await this.prisma.recordTemplate.update({
        where: { id },
        data: updateData
      });

      logger.info(`病历模板更新成功 - 模板ID: ${id}`);
      return updatedTemplate;
    } catch (error) {
      logger.error('更新病历模板失败:', error);
      throw error;
    }
  }

  /**
   * 删除病历模板
   */
  async deleteRecordTemplate(id: string): Promise<void> {
    try {
      const existingTemplate = await this.prisma.recordTemplate.findUnique({
        where: { id }
      });

      if (!existingTemplate) {
        throw new Error('病历模板不存在');
      }

      await this.prisma.recordTemplate.delete({
        where: { id }
      });

      logger.info(`病历模板删除成功 - 模板ID: ${id}`);
    } catch (error) {
      logger.error('删除病历模板失败:', error);
      throw error;
    }
  }

  /**
   * 搜索病历模板
   */
  async searchRecordTemplates(request: SearchRecordTemplatesRequest): Promise<{
    templates: RecordTemplate[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const { category, keyword, page = 1, pageSize = 20 } = request;

      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (keyword) {
        where.OR = [
          { name: { contains: keyword } }
        ];
      }

      const [total, templates] = await Promise.all([
        this.prisma.recordTemplate.count({ where }),
        this.prisma.recordTemplate.findMany({
          where,
          orderBy: [
            { createdAt: 'desc' }
          ],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        templates,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      logger.error('搜索病历模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取模板统计信息
   */
  async getTemplateStatistics(): Promise<{
    totalTemplates: number;
    templatesByCategory: Array<{ category: string; count: number }>;
  }> {
    try {
      const [totalTemplates, templatesByCategory] =
        await Promise.all([
          this.prisma.recordTemplate.count(),
          this.prisma.recordTemplate.groupBy({
            by: ['category'],
            _count: true
          })
        ]);

      const templatesByCategoryFormatted = templatesByCategory.map(item => ({
        category: item.category,
        count: item._count
      }));

      return {
        totalTemplates,
        templatesByCategory: templatesByCategoryFormatted
      };
    } catch (error) {
      logger.error('获取模板统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取常用模板
   */
  async getPopularTemplates(limit: number = 10): Promise<RecordTemplate[]> {
    try {
      const templates = await this.prisma.recordTemplate.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return templates;
    } catch (error) {
      logger.error('获取常用模板失败:', error);
      throw error;
    }
  }
}
