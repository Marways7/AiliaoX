/**
 * 处方管理服务
 *
 * 功能:
 * - 处方创建(关联多个药品)
 * - 处方打印数据生成
 * - 处方历史查询
 * - 处方状态管理
 * - 处方统计信息
 */

import { PrismaClient, Prescription, PrescriptionItem, PrescriptionStatus } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreatePrescriptionDTO {
  patientId: string;
  doctorId: string;
  diagnosis: string;
  notes?: string;
  items: CreatePrescriptionItemDTO[];
}

export interface CreatePrescriptionItemDTO {
  medicineId: string;
  dosage: string;          // 剂量: "100mg"
  frequency: string;       // 频次: "每日3次"
  duration: string;        // 疗程: "7天"
  quantity: number;        // 数量
  instructions?: string;   // 用法说明
}

export interface UpdatePrescriptionDTO {
  diagnosis?: string;
  notes?: string;
  status?: PrescriptionStatus;
}

export interface PrescriptionSearchOptions {
  patientId?: string;
  doctorId?: string;
  status?: PrescriptionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface PrescriptionPrintData {
  prescription: Prescription & {
    patient: any;
    doctor: any;
    items: (PrescriptionItem & { medicine: any })[];
  };
  totalAmount: number;
  printDate: Date;
}

/**
 * 处方管理服务类
 */
export class PrescriptionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 生成处方编号
   * 格式: RX + YYYYMMDD + 5位序号
   */
  private async generatePrescriptionNo(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // 查询当天最后一个处方编号
    const lastPrescription = await this.prisma.prescription.findFirst({
      where: {
        prescriptionNo: {
          startsWith: `RX${dateStr}`
        }
      },
      orderBy: {
        prescriptionNo: 'desc'
      }
    });

    let sequence = 1;
    if (lastPrescription) {
      const lastSequence = parseInt(lastPrescription.prescriptionNo.slice(-5));
      sequence = lastSequence + 1;
    }

    return `RX${dateStr}${sequence.toString().padStart(5, '0')}`;
  }

  /**
   * 创建处方
   */
  async createPrescription(data: CreatePrescriptionDTO): Promise<Prescription> {
    try {
      // 验证患者存在
      const patient = await this.prisma.patient.findUnique({
        where: { id: data.patientId }
      });

      if (!patient) {
        throw new Error('患者不存在');
      }

      // 验证医生存在
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: data.doctorId }
      });

      if (!doctor) {
        throw new Error('医生不存在');
      }

      // 验证所有药品存在并计算总金额
      let totalAmount = 0;
      for (const item of data.items) {
        const medicine = await this.prisma.medicine.findUnique({
          where: { id: item.medicineId }
        });

        if (!medicine) {
          throw new Error(`药品不存在: ${item.medicineId}`);
        }

        totalAmount += parseFloat(medicine.price.toString()) * item.quantity;
      }

      // 生成处方编号
      const prescriptionNo = await this.generatePrescriptionNo();

      // 创建处方和处方项目
      const prescription = await this.prisma.prescription.create({
        data: {
          prescriptionNo,
          patientId: data.patientId,
          doctorId: data.doctorId,
          diagnosis: data.diagnosis,
          notes: data.notes,
          totalAmount,
          items: {
            create: data.items.map(item => ({
              medicineId: item.medicineId,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              quantity: item.quantity,
              instructions: item.instructions
            }))
          }
        },
        include: {
          patient: true,
          doctor: {
            include: {
              department: true
            }
          },
          items: {
            include: {
              medicine: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });

      logger.info(`创建处方成功: ${prescription.prescriptionNo} - 患者: ${patient.name}, 医生: ${doctor.name}`);
      return prescription;
    } catch (error) {
      logger.error('创建处方失败:', error);
      throw error;
    }
  }

  /**
   * 获取处方列表
   */
  async getPrescriptions(options: PrescriptionSearchOptions = {}): Promise<{
    prescriptions: Prescription[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const {
        patientId,
        doctorId,
        status,
        startDate,
        endDate,
        page = 1,
        pageSize = 20
      } = options;

      // 构建查询条件
      const where: any = {};

      if (patientId) {
        where.patientId = patientId;
      }

      if (doctorId) {
        where.doctorId = doctorId;
      }

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // 查询总数
      const total = await this.prisma.prescription.count({ where });

      // 分页查询
      const prescriptions = await this.prisma.prescription.findMany({
        where,
        include: {
          patient: true,
          doctor: {
            include: {
              department: true
            }
          },
          items: {
            include: {
              medicine: true
            }
          }
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        prescriptions,
        total,
        page,
        pageSize
      };
    } catch (error) {
      logger.error('获取处方列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取处方详情
   */
  async getPrescriptionById(id: string): Promise<Prescription | null> {
    try {
      const prescription = await this.prisma.prescription.findUnique({
        where: { id },
        include: {
          patient: true,
          doctor: {
            include: {
              department: true,
              user: {
                select: {
                  username: true,
                  email: true
                }
              }
            }
          },
          items: {
            include: {
              medicine: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });

      return prescription;
    } catch (error) {
      logger.error('获取处方详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新处方
   */
  async updatePrescription(id: string, data: UpdatePrescriptionDTO): Promise<Prescription> {
    try {
      // 验证处方存在
      const prescription = await this.prisma.prescription.findUnique({
        where: { id }
      });

      if (!prescription) {
        throw new Error('处方不存在');
      }

      // 只有草稿状态的处方可以修改诊断和备注
      if (prescription.status !== PrescriptionStatus.DRAFT &&
          (data.diagnosis || data.notes)) {
        throw new Error('只有草稿状态的处方可以修改诊断和备注');
      }

      const updated = await this.prisma.prescription.update({
        where: { id },
        data,
        include: {
          patient: true,
          doctor: {
            include: {
              department: true
            }
          },
          items: {
            include: {
              medicine: true
            }
          }
        }
      });

      logger.info(`更新处方成功: ${updated.prescriptionNo}`);
      return updated;
    } catch (error) {
      logger.error('更新处方失败:', error);
      throw error;
    }
  }

  /**
   * 审核并批准处方
   */
  async approvePrescription(id: string): Promise<Prescription> {
    try {
      const prescription = await this.prisma.prescription.findUnique({
        where: { id }
      });

      if (!prescription) {
        throw new Error('处方不存在');
      }

      if (prescription.status !== PrescriptionStatus.PENDING_APPROVAL) {
        throw new Error('处方状态不正确,无法批准');
      }

      const updated = await this.prisma.prescription.update({
        where: { id },
        data: {
          status: PrescriptionStatus.APPROVED,
          issuedAt: new Date()
        },
        include: {
          patient: true,
          doctor: true,
          items: {
            include: {
              medicine: true
            }
          }
        }
      });

      logger.info(`批准处方成功: ${updated.prescriptionNo}`);
      return updated;
    } catch (error) {
      logger.error('批准处方失败:', error);
      throw error;
    }
  }

  /**
   * 发药 (更新处方状态为已发药)
   */
  async dispensePrescription(id: string): Promise<Prescription> {
    try {
      const prescription = await this.prisma.prescription.findUnique({
        where: { id }
      });

      if (!prescription) {
        throw new Error('处方不存在');
      }

      if (prescription.status !== PrescriptionStatus.APPROVED) {
        throw new Error('处方尚未批准,无法发药');
      }

      const updated = await this.prisma.prescription.update({
        where: { id },
        data: {
          status: PrescriptionStatus.DISPENSED,
          dispensedAt: new Date()
        },
        include: {
          patient: true,
          doctor: true,
          items: {
            include: {
              medicine: true
            }
          }
        }
      });

      logger.info(`发药成功: ${updated.prescriptionNo}`);
      return updated;
    } catch (error) {
      logger.error('发药失败:', error);
      throw error;
    }
  }

  /**
   * 取消处方
   */
  async cancelPrescription(id: string): Promise<Prescription> {
    try {
      const prescription = await this.prisma.prescription.findUnique({
        where: { id }
      });

      if (!prescription) {
        throw new Error('处方不存在');
      }

      if (prescription.status === PrescriptionStatus.DISPENSED) {
        throw new Error('已发药的处方无法取消');
      }

      const updated = await this.prisma.prescription.update({
        where: { id },
        data: {
          status: PrescriptionStatus.CANCELLED
        },
        include: {
          patient: true,
          doctor: true
        }
      });

      logger.info(`取消处方成功: ${updated.prescriptionNo}`);
      return updated;
    } catch (error) {
      logger.error('取消处方失败:', error);
      throw error;
    }
  }

  /**
   * 获取处方打印数据
   */
  async getPrescriptionPrintData(id: string): Promise<PrescriptionPrintData> {
    try {
      const prescription = await this.prisma.prescription.findUnique({
        where: { id },
        include: {
          patient: true,
          doctor: {
            include: {
              department: true,
              user: true
            }
          },
          items: {
            include: {
              medicine: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });

      if (!prescription) {
        throw new Error('处方不存在');
      }

      // 计算总金额
      let totalAmount = 0;
      for (const item of prescription.items) {
        const price = parseFloat(item.medicine.price.toString());
        totalAmount += price * item.quantity;
      }

      return {
        prescription: prescription as any,
        totalAmount,
        printDate: new Date()
      };
    } catch (error) {
      logger.error('获取处方打印数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取患者处方历史
   */
  async getPatientPrescriptions(
    patientId: string,
    limit = 10
  ): Promise<Prescription[]> {
    try {
      const prescriptions = await this.prisma.prescription.findMany({
        where: {
          patientId,
          status: {
            not: PrescriptionStatus.CANCELLED
          }
        },
        include: {
          doctor: {
            include: {
              department: true
            }
          },
          items: {
            include: {
              medicine: true
            }
          }
        },
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });

      return prescriptions;
    } catch (error) {
      logger.error('获取患者处方历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取医生处方统计
   */
  async getDoctorPrescriptionStats(doctorId: string) {
    try {
      const [
        total,
        statusStats,
        recentPrescriptions
      ] = await Promise.all([
        // 总处方数
        this.prisma.prescription.count({
          where: { doctorId }
        }),

        // 各状态处方数
        Promise.all(
          Object.values(PrescriptionStatus).map(async (status) => {
            const count = await this.prisma.prescription.count({
              where: {
                doctorId,
                status
              }
            });
            return { status, count };
          })
        ),

        // 最近处方
        this.prisma.prescription.findMany({
          where: { doctorId },
          include: {
            patient: true,
            items: {
              include: {
                medicine: true
              }
            }
          },
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        })
      ]);

      return {
        total,
        statusStats,
        recentPrescriptions
      };
    } catch (error) {
      logger.error('获取医生处方统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取处方统计信息
   */
  async getPrescriptionStatistics() {
    try {
      const [
        total,
        statusStats,
        todayCount,
        thisWeekCount
      ] = await Promise.all([
        // 总处方数
        this.prisma.prescription.count(),

        // 各状态处方数
        Promise.all(
          Object.values(PrescriptionStatus).map(async (status) => {
            const count = await this.prisma.prescription.count({
              where: { status }
            });
            return { status, count };
          })
        ),

        // 今日处方数
        this.prisma.prescription.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),

        // 本周处方数
        this.prisma.prescription.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        total,
        statusStats,
        todayCount,
        thisWeekCount
      };
    } catch (error) {
      logger.error('获取处方统计失败:', error);
      throw error;
    }
  }
}
