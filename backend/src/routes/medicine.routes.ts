/**
 * 药物管理API路由
 *
 * 端点：
 * - POST   /api/v1/medicines - 创建药品
 * - GET    /api/v1/medicines - 药品列表（分页、搜索、筛选）
 * - GET    /api/v1/medicines/:id - 获取药品详情
 * - PUT    /api/v1/medicines/:id - 更新药品信息
 * - DELETE /api/v1/medicines/:id - 删除药品
 * - GET    /api/v1/medicines/search/quick - 药品快速搜索
 * - GET    /api/v1/medicines/:id/stock - 获取药品库存信息
 * - GET    /api/v1/medicines/statistics/overview - 药品统计信息
 * - GET    /api/v1/medicines/categories - 获取药品分类列表
 * - POST   /api/v1/medicines/categories - 创建药品分类
 */

import { Router, Request, Response } from 'express';
import { MedicineService } from '../services/medicine.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ZodError, z } from 'zod';

const router = Router();
const medicineService = new MedicineService(prisma);

// Zod验证Schema
const CreateMedicineSchema = z.object({
  name: z.string().min(1, '药品名称不能为空'),
  genericName: z.string().optional(),
  categoryId: z.string().min(1, '药品分类不能为空'),
  specification: z.string().min(1, '规格不能为空'),
  unit: z.string().min(1, '单位不能为空'),
  manufacturer: z.string().optional(),
  price: z.number().positive('价格必须大于0'),
  description: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional()
});

const UpdateMedicineSchema = z.object({
  name: z.string().min(1).optional(),
  genericName: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  specification: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  manufacturer: z.string().optional(),
  price: z.number().positive().optional(),
  description: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional()
});

const MedicineSearchSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().optional(),
  manufacturer: z.string().optional(),
  minPrice: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
  page: z.string().transform(Number).optional(),
  pageSize: z.string().transform(Number).optional()
});

const CreateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  description: z.string().optional()
});

/**
 * 创建药品
 * POST /api/v1/medicines
 * 权限：MEDICINE_CREATE
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_CREATE),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CreateMedicineSchema.parse(req.body);

      const medicine = await medicineService.createMedicine(validatedData);

      logger.info(`药品创建成功: ${medicine.name} (${medicine.medicineNo}) - 用户: ${req.user?.username}`);

      return res.status(201).json({
        success: true,
        message: '药品创建成功',
        data: medicine
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('创建药品失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建药品失败'
      });
    }
  }
);

/**
 * 获取药品列表（分页、搜索、筛选）
 * GET /api/v1/medicines
 * 权限：MEDICINE_VIEW
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery = MedicineSearchSchema.parse(req.query);

      const result = await medicineService.getMedicines(validatedQuery);

      return res.json({
        success: true,
        data: result.medicines,
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

      logger.error('获取药品列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取药品列表失败'
      });
    }
  }
);

/**
 * 药品快速搜索
 * GET /api/v1/medicines/search/quick
 * 权限：MEDICINE_VIEW
 */
router.get(
  '/search/quick',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { keyword, limit } = req.query;

      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({
          success: false,
          message: '搜索关键词不能为空'
        });
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 10;

      const medicines = await medicineService.searchMedicines(keyword, limitNum);

      return res.json({
        success: true,
        data: medicines
      });
    } catch (error) {
      logger.error('快速搜索药品失败:', error);
      return res.status(500).json({
        success: false,
        message: '搜索药品失败'
      });
    }
  }
);

/**
 * 获取药品库存信息
 * GET /api/v1/medicines/:id/stock
 * 权限：MEDICINE_VIEW
 */
router.get(
  '/:id/stock',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const stockInfo = await medicineService.getMedicineStock(id);

      return res.json({
        success: true,
        data: stockInfo
      });
    } catch (error) {
      logger.error('获取药品库存失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取药品库存失败'
      });
    }
  }
);

/**
 * 获取药品统计信息
 * GET /api/v1/medicines/statistics/overview
 * 权限：MEDICINE_VIEW
 */
router.get(
  '/statistics/overview',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_VIEW),
  async (_req: Request, res: Response) => {
    try {
      const statistics = await medicineService.getMedicineStatistics();

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('获取药品统计失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取药品统计失败'
      });
    }
  }
);

/**
 * 获取药品分类列表
 * GET /api/v1/medicines/categories
 * 权限：MEDICINE_VIEW
 */
router.get(
  '/categories',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_VIEW),
  async (_req: Request, res: Response) => {
    try {
      const categories = await medicineService.getCategories();

      return res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('获取药品分类失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取药品分类失败'
      });
    }
  }
);

/**
 * 创建药品分类
 * POST /api/v1/medicines/categories
 * 权限：MEDICINE_CATEGORY_MANAGE
 */
router.post(
  '/categories',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_CATEGORY_MANAGE),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CreateCategorySchema.parse(req.body);

      const category = await medicineService.createCategory(validatedData);

      logger.info(`药品分类创建成功: ${category.name} - 用户: ${req.user?.username}`);

      return res.status(201).json({
        success: true,
        message: '药品分类创建成功',
        data: category
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('创建药品分类失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建药品分类失败'
      });
    }
  }
);

/**
 * 获取药品详情
 * GET /api/v1/medicines/:id
 * 权限：MEDICINE_VIEW
 *
 * 注意：此路由必须在所有静态路由（/categories, /search/quick, /statistics/overview, /:id/stock）之后定义
 * 否则会导致静态路由被误匹配为动态路由的id参数
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_VIEW),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const medicine = await medicineService.getMedicineById(id);

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: '药品不存在'
        });
      }

      return res.json({
        success: true,
        data: medicine
      });
    } catch (error) {
      logger.error('获取药品详情失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取药品详情失败'
      });
    }
  }
);

/**
 * 更新药品信息
 * PUT /api/v1/medicines/:id
 * 权限：MEDICINE_UPDATE
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_UPDATE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = UpdateMedicineSchema.parse(req.body);

      const medicine = await medicineService.updateMedicine(id, validatedData);

      logger.info(`药品更新成功: ${medicine.name} (${medicine.medicineNo}) - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '药品更新成功',
        data: medicine
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: error.errors
        });
      }

      logger.error('更新药品失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新药品失败'
      });
    }
  }
);

/**
 * 删除药品
 * DELETE /api/v1/medicines/:id
 * 权限：MEDICINE_DELETE
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.MEDICINE_DELETE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await medicineService.deleteMedicine(id);

      logger.info(`药品删除成功: ${id} - 用户: ${req.user?.username}`);

      return res.json({
        success: true,
        message: '药品删除成功'
      });
    } catch (error) {
      logger.error('删除药品失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除药品失败'
      });
    }
  }
);

export default router;
