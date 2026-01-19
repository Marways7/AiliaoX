/**
 * 药物信息管理服务
 *
 * 功能:
 * - 药品信息CRUD管理
 * - 药品分类管理
 * - 药品库存查询
 * - 药品搜索和筛选
 * - 常用药品收藏
 */

import { PrismaClient, Medicine, MedicineCategory } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateMedicineDTO {
  name: string;
  genericName?: string;
  categoryId: string;
  specification: string;
  unit: string;
  manufacturer?: string;
  price: number;
  description?: string;
  sideEffects?: string;
  contraindications?: string;
}

export interface UpdateMedicineDTO {
  name?: string;
  genericName?: string;
  categoryId?: string;
  specification?: string;
  unit?: string;
  manufacturer?: string;
  price?: number;
  description?: string;
  sideEffects?: string;
  contraindications?: string;
}

export interface MedicineSearchOptions {
  name?: string;
  categoryId?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

/**
 * 药物信息管理服务类
 */
export class MedicineService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 生成药品编号
   * 格式: M + YYYYMMDD + 5位序号
   */
  private async generateMedicineNo(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // 查询当天最后一个药品编号
    const lastMedicine = await this.prisma.medicine.findFirst({
      where: {
        medicineNo: {
          startsWith: `M${dateStr}`
        }
      },
      orderBy: {
        medicineNo: 'desc'
      }
    });

    let sequence = 1;
    if (lastMedicine) {
      const lastSequence = parseInt(lastMedicine.medicineNo.slice(-5));
      sequence = lastSequence + 1;
    }

    return `M${dateStr}${sequence.toString().padStart(5, '0')}`;
  }

  /**
   * 创建药品
   */
  async createMedicine(data: CreateMedicineDTO): Promise<Medicine> {
    try {
      // 验证分类存在
      const category = await this.prisma.medicineCategory.findUnique({
        where: { id: data.categoryId }
      });

      if (!category) {
        throw new Error('药品分类不存在');
      }

      // 生成药品编号
      const medicineNo = await this.generateMedicineNo();

      const medicine = await this.prisma.medicine.create({
        data: {
          medicineNo,
          name: data.name,
          genericName: data.genericName,
          categoryId: data.categoryId,
          specification: data.specification,
          unit: data.unit,
          manufacturer: data.manufacturer,
          price: data.price,
          description: data.description,
          sideEffects: data.sideEffects,
          contraindications: data.contraindications
        },
        include: {
          category: true
        }
      });

      logger.info(`创建药品成功: ${medicine.name} (${medicine.medicineNo})`);
      return medicine;
    } catch (error) {
      logger.error('创建药品失败:', error);
      throw error;
    }
  }

  /**
   * 获取药品列表
   */
  async getMedicines(options: MedicineSearchOptions = {}): Promise<{
    medicines: Medicine[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const {
        name,
        categoryId,
        manufacturer,
        minPrice,
        maxPrice,
        page = 1,
        pageSize = 20
      } = options;

      // 构建查询条件
      const where: any = {};

      if (name) {
        where.OR = [
          { name: { contains: name } },
          { genericName: { contains: name } }
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (manufacturer) {
        where.manufacturer = { contains: manufacturer };
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) {
          where.price.gte = minPrice;
        }
        if (maxPrice !== undefined) {
          where.price.lte = maxPrice;
        }
      }

      // 查询总数
      const total = await this.prisma.medicine.count({ where });

      // 分页查询
      const medicines = await this.prisma.medicine.findMany({
        where,
        include: {
          category: true,
          stocks: true
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        medicines,
        total,
        page,
        pageSize
      };
    } catch (error) {
      logger.error('获取药品列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取药品详情
   */
  async getMedicineById(id: string): Promise<Medicine | null> {
    try {
      const medicine = await this.prisma.medicine.findUnique({
        where: { id },
        include: {
          category: true,
          stocks: true
        }
      });

      return medicine;
    } catch (error) {
      logger.error('获取药品详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新药品信息
   */
  async updateMedicine(id: string, data: UpdateMedicineDTO): Promise<Medicine> {
    try {
      // 验证药品存在
      const medicine = await this.prisma.medicine.findUnique({
        where: { id }
      });

      if (!medicine) {
        throw new Error('药品不存在');
      }

      // 如果更新分类,验证分类存在
      if (data.categoryId) {
        const category = await this.prisma.medicineCategory.findUnique({
          where: { id: data.categoryId }
        });

        if (!category) {
          throw new Error('药品分类不存在');
        }
      }

      const updated = await this.prisma.medicine.update({
        where: { id },
        data,
        include: {
          category: true,
          stocks: true
        }
      });

      logger.info(`更新药品成功: ${updated.name} (${updated.medicineNo})`);
      return updated;
    } catch (error) {
      logger.error('更新药品失败:', error);
      throw error;
    }
  }

  /**
   * 删除药品
   */
  async deleteMedicine(id: string): Promise<void> {
    try {
      // 验证药品存在
      const medicine = await this.prisma.medicine.findUnique({
        where: { id }
      });

      if (!medicine) {
        throw new Error('药品不存在');
      }

      // 检查是否有关联的处方项目
      const prescriptionItemCount = await this.prisma.prescriptionItem.count({
        where: { medicineId: id }
      });

      if (prescriptionItemCount > 0) {
        throw new Error('该药品已被使用,无法删除');
      }

      // 删除药品及其库存
      await this.prisma.$transaction([
        this.prisma.medicineStock.deleteMany({
          where: { medicineId: id }
        }),
        this.prisma.medicine.delete({
          where: { id }
        })
      ]);

      logger.info(`删除药品成功: ${medicine.name} (${medicine.medicineNo})`);
    } catch (error) {
      logger.error('删除药品失败:', error);
      throw error;
    }
  }

  /**
   * 搜索药品 (用于快速查找)
   */
  async searchMedicines(keyword: string, limit = 10): Promise<Medicine[]> {
    try {
      const medicines = await this.prisma.medicine.findMany({
        where: {
          OR: [
            { name: { contains: keyword } },
            { genericName: { contains: keyword } },
            { medicineNo: { contains: keyword } }
          ]
        },
        include: {
          category: true
        },
        take: limit,
        orderBy: {
          name: 'asc'
        }
      });

      return medicines;
    } catch (error) {
      logger.error('搜索药品失败:', error);
      throw error;
    }
  }

  /**
   * 获取药品分类列表
   */
  async getCategories(): Promise<MedicineCategory[]> {
    try {
      const categories = await this.prisma.medicineCategory.findMany({
        include: {
          _count: {
            select: { medicines: true }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return categories;
    } catch (error) {
      logger.error('获取药品分类失败:', error);
      throw error;
    }
  }

  /**
   * 创建药品分类
   */
  async createCategory(data: CreateCategoryDTO): Promise<MedicineCategory> {
    try {
      // 检查分类名称是否重复
      const existing = await this.prisma.medicineCategory.findUnique({
        where: { name: data.name }
      });

      if (existing) {
        throw new Error('分类名称已存在');
      }

      const category = await this.prisma.medicineCategory.create({
        data
      });

      logger.info(`创建药品分类成功: ${category.name}`);
      return category;
    } catch (error) {
      logger.error('创建药品分类失败:', error);
      throw error;
    }
  }

  /**
   * 获取药品库存信息
   */
  async getMedicineStock(medicineId: string) {
    try {
      const stocks = await this.prisma.medicineStock.findMany({
        where: { medicineId },
        include: {
          medicine: true
        },
        orderBy: {
          expiryDate: 'asc'
        }
      });

      // 计算总库存
      const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

      // 检查低库存和过期
      const lowStockItems = stocks.filter(s => s.quantity <= s.minStock);
      const expiredItems = stocks.filter(s => s.expiryDate < new Date());
      const expiringItems = stocks.filter(s => {
        const daysUntilExpiry = Math.floor(
          (s.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      });

      return {
        stocks,
        totalQuantity,
        alerts: {
          lowStock: lowStockItems.length > 0,
          expired: expiredItems.length > 0,
          expiring: expiringItems.length > 0
        },
        lowStockItems,
        expiredItems,
        expiringItems
      };
    } catch (error) {
      logger.error('获取药品库存失败:', error);
      throw error;
    }
  }

  /**
   * 获取药品统计信息
   */
  async getMedicineStatistics() {
    try {
      const [
        total,
        categoryStats,
        lowStockCount,
        expiredCount
      ] = await Promise.all([
        // 总药品数
        this.prisma.medicine.count(),

        // 各分类药品数
        this.prisma.medicineCategory.findMany({
          include: {
            _count: {
              select: { medicines: true }
            }
          }
        }),

        // 低库存药品数
        this.prisma.medicineStock.count({
          where: {
            quantity: {
              lte: this.prisma.medicineStock.fields.minStock
            }
          }
        }),

        // 过期药品数
        this.prisma.medicineStock.count({
          where: {
            expiryDate: {
              lt: new Date()
            }
          }
        })
      ]);

      return {
        total,
        categoryStats: categoryStats.map(c => ({
          categoryId: c.id,
          categoryName: c.name,
          count: c._count.medicines
        })),
        alerts: {
          lowStock: lowStockCount,
          expired: expiredCount
        }
      };
    } catch (error) {
      logger.error('获取药品统计失败:', error);
      throw error;
    }
  }
}
