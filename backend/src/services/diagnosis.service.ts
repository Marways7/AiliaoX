/**
 * 诊断管理服务
 *
 * 功能:
 * - 诊断记录创建和管理
 * - ICD-10编码管理
 * - 诊断历史查询
 * - 常见诊断统计
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// 注意: Prisma schema中没有独立的Diagnosis表，诊断信息存储在MedicalRecord中
// 这里提供一个诊断辅助服务，用于诊断数据的提取和分析

export interface DiagnosisInfo {
  icd10Code?: string;
  diagnosisName: string;
  diagnosisType: 'primary' | 'secondary' | 'differential';
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface CreateDiagnosisRequest {
  medicalRecordId: string;
  diagnoses: DiagnosisInfo[];
}

export interface SearchDiagnosisRequest {
  keyword?: string;
  icd10Code?: string;
  patientId?: string;
  doctorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * 诊断管理服务类
 */
export class DiagnosisService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 根据ICD-10编码查询诊断信息
   * 注意: 这是一个示例实现，实际应用中应该有专门的ICD-10数据库
   */
  async getByICD10Code(code: string): Promise<any> {
    try {
      // 这里返回一个模拟的ICD-10编码信息
      // 实际应用中应该查询ICD-10数据库
      const icd10Data: Record<string, any> = {
        'J00': {
          code: 'J00',
          name: '急性鼻咽炎(普通感冒)',
          category: '呼吸系统疾病',
          description: '由病毒引起的上呼吸道感染'
        },
        'I10': {
          code: 'I10',
          name: '特发性高血压',
          category: '循环系统疾病',
          description: '原发性高血压'
        },
        'E11': {
          code: 'E11',
          name: '2型糖尿病',
          category: '内分泌、营养和代谢疾病',
          description: '非胰岛素依赖型糖尿病'
        },
        'K29': {
          code: 'K29',
          name: '胃炎和十二指肠炎',
          category: '消化系统疾病',
          description: '胃黏膜或十二指肠黏膜炎症'
        }
      };

      return icd10Data[code] || {
        code,
        name: '未找到对应的ICD-10编码',
        category: '未知',
        description: '请查询ICD-10编码手册'
      };
    } catch (error) {
      logger.error('查询ICD-10编码失败:', error);
      throw error;
    }
  }

  /**
   * 搜索诊断记录
   * 从病历中提取诊断信息
   */
  async searchDiagnoses(request: SearchDiagnosisRequest): Promise<{
    diagnoses: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        keyword,
        patientId,
        doctorId,
        dateFrom,
        dateTo,
        page = 1,
        pageSize = 20
      } = request;

      const where: any = {};

      if (patientId) {
        where.patientId = patientId;
      }

      if (doctorId) {
        where.doctorId = doctorId;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = dateFrom;
        }
        if (dateTo) {
          where.createdAt.lte = dateTo;
        }
      }

      if (keyword) {
        where.diagnosis = {
          contains: keyword
        };
      }

      const [total, records] = await Promise.all([
        this.prisma.medicalRecord.count({ where }),
        this.prisma.medicalRecord.findMany({
          where,
          select: {
            id: true,
            recordNo: true,
            diagnosis: true,
            createdAt: true,
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
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const totalPages = Math.ceil(total / pageSize);

      // 格式化诊断数据
      const diagnoses = records.map(record => ({
        id: record.id,
        recordNo: record.recordNo,
        diagnosis: record.diagnosis,
        diagnosisDate: record.createdAt,
        patient: record.patient,
        doctor: record.doctor
      }));

      return {
        diagnoses,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      logger.error('搜索诊断记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取常见诊断统计
   */
  async getCommonDiagnoses(options?: {
    doctorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<Array<{ diagnosis: string; count: number }>> {
    try {
      const where: any = {};

      if (options?.doctorId) {
        where.doctorId = options.doctorId;
      }

      if (options?.dateFrom || options?.dateTo) {
        where.createdAt = {};
        if (options.dateFrom) {
          where.createdAt.gte = options.dateFrom;
        }
        if (options.dateTo) {
          where.createdAt.lte = options.dateTo;
        }
      }

      // 获取所有诊断
      const records = await this.prisma.medicalRecord.findMany({
        where,
        select: {
          diagnosis: true
        }
      });

      // 统计诊断频率
      const diagnosisCount: Map<string, number> = new Map();
      records.forEach(record => {
        const diagnosis = record.diagnosis.trim();
        if (diagnosis) {
          diagnosisCount.set(diagnosis, (diagnosisCount.get(diagnosis) || 0) + 1);
        }
      });

      // 转换为数组并排序
      const commonDiagnoses = Array.from(diagnosisCount.entries())
        .map(([diagnosis, count]) => ({ diagnosis, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, options?.limit || 10);

      logger.info(`获取常见诊断统计成功 - 返回 ${commonDiagnoses.length} 条记录`);
      return commonDiagnoses;
    } catch (error) {
      logger.error('获取常见诊断统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取诊断统计信息
   */
  async getDiagnosisStatistics(options?: {
    doctorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    totalDiagnoses: number;
    uniqueDiagnoses: number;
    recentDiagnoses: number;
    topDiagnoses: Array<{ diagnosis: string; count: number }>;
  }> {
    try {
      const where: any = {};

      if (options?.doctorId) {
        where.doctorId = options.doctorId;
      }

      if (options?.dateFrom || options?.dateTo) {
        where.createdAt = {};
        if (options.dateFrom) {
          where.createdAt.gte = options.dateFrom;
        }
        if (options.dateTo) {
          where.createdAt.lte = options.dateTo;
        }
      }

      const [totalRecords, recentRecords] = await Promise.all([
        this.prisma.medicalRecord.count({ where }),
        this.prisma.medicalRecord.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
            }
          }
        })
      ]);

      // 获取所有诊断
      const records = await this.prisma.medicalRecord.findMany({
        where,
        select: {
          diagnosis: true
        }
      });

      // 统计唯一诊断数量
      const uniqueDiagnosesSet = new Set(records.map(r => r.diagnosis.trim()).filter(d => d));

      // 获取Top诊断
      const topDiagnoses = await this.getCommonDiagnoses({ ...options, limit: 5 });

      return {
        totalDiagnoses: totalRecords,
        uniqueDiagnoses: uniqueDiagnosesSet.size,
        recentDiagnoses: recentRecords,
        topDiagnoses
      };
    } catch (error) {
      logger.error('获取诊断统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据患者ID获取诊断历史
   */
  async getPatientDiagnosisHistory(patientId: string, limit: number = 10): Promise<any[]> {
    try {
      const records = await this.prisma.medicalRecord.findMany({
        where: { patientId },
        select: {
          id: true,
          recordNo: true,
          diagnosis: true,
          chiefComplaint: true,
          treatmentPlan: true,
          createdAt: true,
          doctor: {
            select: {
              name: true,
              title: true,
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return records.map(record => ({
        id: record.id,
        recordNo: record.recordNo,
        diagnosis: record.diagnosis,
        chiefComplaint: record.chiefComplaint,
        treatmentPlan: record.treatmentPlan,
        diagnosisDate: record.createdAt,
        doctor: record.doctor
      }));
    } catch (error) {
      logger.error('获取患者诊断历史失败:', error);
      throw error;
    }
  }
}
