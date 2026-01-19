/**
 * 病历管理服务
 *
 * 功能:
 * - 病历创建、更新、查询、删除
 * - 病历历史查询和版本管理
 * - 患者病历列表
 * - 医生病历统计
 * - 病历状态管理
 */

import { PrismaClient, RecordType, MedicalRecord, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import puppeteer from 'puppeteer';

export interface CreateMedicalRecordRequest {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  templateId?: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory?: string;
  familyHistory?: string;
  physicalExam?: string;
  auxiliaryExam?: string;
  diagnosis: string;
  treatmentPlan: string;
  followUpPlan?: string;
  recordType: RecordType;
}

export interface UpdateMedicalRecordRequest {
  chiefComplaint?: string;
  presentIllness?: string;
  pastHistory?: string;
  familyHistory?: string;
  physicalExam?: string;
  auxiliaryExam?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  followUpPlan?: string;
  aiSummary?: string;
  aiDiagnosticAdvice?: string;
}

export interface SearchMedicalRecordsRequest {
  patientId?: string;
  doctorId?: string;
  department?: string;
  recordType?: RecordType;
  dateFrom?: Date;
  dateTo?: Date;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 病历管理服务类
 */
export class MedicalRecordService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建病历
   */
  async createMedicalRecord(request: CreateMedicalRecordRequest): Promise<MedicalRecord> {
    try {
      const {
        patientId,
        doctorId,
        appointmentId,
        templateId,
        chiefComplaint,
        presentIllness,
        pastHistory,
        familyHistory,
        physicalExam,
        auxiliaryExam,
        diagnosis,
        treatmentPlan,
        followUpPlan,
        recordType
      } = request;

      // 验证患者是否存在
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId }
      });
      if (!patient) {
        throw new Error('患者不存在');
      }

      // 验证医生是否存在
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId }
      });
      if (!doctor) {
        throw new Error('医生不存在');
      }

      // 生成病历编号 (格式: R + 日期 + 5位序号)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await this.prisma.medicalRecord.count({
        where: {
          recordNo: {
            startsWith: `R${dateStr}`
          }
        }
      });
      const recordNo = `R${dateStr}${String(count + 1).padStart(5, '0')}`;

      // 创建病历
      const medicalRecord = await this.prisma.medicalRecord.create({
        data: {
          recordNo,
          patientId,
          doctorId,
          appointmentId,
          templateId,
          chiefComplaint,
          presentIllness,
          pastHistory,
          familyHistory,
          physicalExam,
          auxiliaryExam,
          diagnosis,
          treatmentPlan,
          followUpPlan,
          recordType,
          version: 1,
          isFinal: false
        },
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
        }
      });

      logger.info(`病历创建成功 - 病历号: ${recordNo}, 患者: ${patient.name}, 医生: ${doctor.name}`);
      return medicalRecord;
    } catch (error) {
      logger.error('创建病历失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取病历详情
   */
  async getMedicalRecordById(id: string): Promise<MedicalRecord | null> {
    try {
      const medicalRecord = await this.prisma.medicalRecord.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientNo: true,
              name: true,
              gender: true,
              birthDate: true,
              bloodType: true,
              allergies: true
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
          },
          appointment: {
            select: {
              id: true,
              appointmentNo: true,
              appointmentDate: true,
              timeSlot: true
            }
          },
          template: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          images: {
            select: {
              id: true,
              imageType: true,
              url: true,
              thumbnailUrl: true,
              description: true,
              aiAnalysis: true,
              uploadedAt: true
            }
          }
        }
      });

      return medicalRecord;
    } catch (error) {
      logger.error('获取病历详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新病历
   */
  async updateMedicalRecord(id: string, request: UpdateMedicalRecordRequest): Promise<MedicalRecord> {
    try {
      // 检查病历是否存在
      const existingRecord = await this.prisma.medicalRecord.findUnique({
        where: { id }
      });

      if (!existingRecord) {
        throw new Error('病历不存在');
      }

      if (existingRecord.isFinal) {
        throw new Error('已归档的病历不能修改');
      }

      // 更新病历
      const updatedRecord = await this.prisma.medicalRecord.update({
        where: { id },
        data: {
          ...request,
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              patientNo: true,
              name: true
            }
          },
          doctor: {
            select: {
              id: true,
              doctorNo: true,
              name: true
            }
          }
        }
      });

      logger.info(`病历更新成功 - 病历号: ${existingRecord.recordNo}`);
      return updatedRecord;
    } catch (error) {
      logger.error('更新病历失败:', error);
      throw error;
    }
  }

  /**
   * 删除病历（软删除）
   */
  async deleteMedicalRecord(id: string): Promise<void> {
    try {
      const existingRecord = await this.prisma.medicalRecord.findUnique({
        where: { id }
      });

      if (!existingRecord) {
        throw new Error('病历不存在');
      }

      if (existingRecord.isFinal) {
        throw new Error('已归档的病历不能删除');
      }

      // 软删除（可以通过将isFinal设为true来表示归档/删除）
      await this.prisma.medicalRecord.delete({
        where: { id }
      });

      logger.info(`病历删除成功 - 病历号: ${existingRecord.recordNo}`);
    } catch (error) {
      logger.error('删除病历失败:', error);
      throw error;
    }
  }

  /**
   * 搜索病历
   */
  async searchMedicalRecords(request: SearchMedicalRecordsRequest): Promise<{
    records: MedicalRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        patientId,
        doctorId,
        department,
        recordType,
        dateFrom,
        dateTo,
        keyword,
        page = 1,
        pageSize = 20
      } = request;

      const where: Prisma.MedicalRecordWhereInput = {};

      if (patientId) {
        where.patientId = patientId;
      }

      if (doctorId) {
        where.doctorId = doctorId;
      }

      if (department) {
        where.doctor = {
          department: {
            name: department
          }
        };
      }

      if (recordType) {
        where.recordType = recordType;
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
        where.OR = [
          { recordNo: { contains: keyword } },
          { chiefComplaint: { contains: keyword } },
          { presentIllness: { contains: keyword } },
          { diagnosis: { contains: keyword } },
          { treatmentPlan: { contains: keyword } }
        ];
      }

      const [total, records] = await Promise.all([
        this.prisma.medicalRecord.count({ where }),
        this.prisma.medicalRecord.findMany({
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
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        records,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      logger.error('搜索病历失败:', error);
      throw error;
    }
  }

  /**
   * 获取患者病历历史
   */
  async getPatientMedicalRecords(patientId: string, limit: number = 10): Promise<MedicalRecord[]> {
    try {
      const records = await this.prisma.medicalRecord.findMany({
        where: { patientId },
        include: {
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
        take: limit
      });

      return records;
    } catch (error) {
      logger.error('获取患者病历历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取病历版本历史
   */
  async getMedicalRecordVersions(recordNo: string): Promise<MedicalRecord[]> {
    try {
      const records = await this.prisma.medicalRecord.findMany({
        where: { recordNo },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              title: true
            }
          }
        },
        orderBy: { version: 'desc' }
      });

      return records;
    } catch (error) {
      logger.error('获取病历版本历史失败:', error);
      throw error;
    }
  }

  /**
   * 锁定病历（归档）
   */
  async lockMedicalRecord(id: string): Promise<MedicalRecord> {
    try {
      const record = await this.prisma.medicalRecord.findUnique({
        where: { id }
      });

      if (!record) {
        throw new Error('病历不存在');
      }

      if (record.isFinal) {
        throw new Error('病历已归档');
      }

      const lockedRecord = await this.prisma.medicalRecord.update({
        where: { id },
        data: {
          isFinal: true,
          finalizedAt: new Date()
        }
      });

      logger.info(`病历归档成功 - 病历号: ${record.recordNo}`);
      return lockedRecord;
    } catch (error) {
      logger.error('锁定病历失败:', error);
      throw error;
    }
  }

  /**
   * 获取病历统计信息
   */
  async getMedicalRecordStatistics(options?: {
    patientId?: string;
    doctorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    totalRecords: number;
    recordsByType: Array<{ recordType: RecordType; count: number }>;
    recentRecords: number;
    finalizedRecords: number;
  }> {
    try {
      const where: Prisma.MedicalRecordWhereInput = {};

      if (options?.patientId) {
        where.patientId = options.patientId;
      }

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

      const [totalRecords, recordsByType, recentRecords, finalizedRecords] = await Promise.all([
        this.prisma.medicalRecord.count({ where }),
        this.prisma.medicalRecord.groupBy({
          by: ['recordType'],
          where,
          _count: true
        }),
        this.prisma.medicalRecord.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
            }
          }
        }),
        this.prisma.medicalRecord.count({
          where: {
            ...where,
            isFinal: true
          }
        })
      ]);

      const recordsByTypeFormatted = recordsByType.map(item => ({
        recordType: item.recordType,
        count: item._count
      }));

      return {
        totalRecords,
        recordsByType: recordsByTypeFormatted,
        recentRecords,
        finalizedRecords
      };
    } catch (error) {
      logger.error('获取病历统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 导出病历为PDF
   * @param medicalRecord 病历对象（包含关联数据）
   * @returns PDF文件Buffer
   */
  async exportToPDF(medicalRecord: any): Promise<Buffer> {
    try {
      // 生成HTML内容
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
      padding: 40px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin-bottom: 30px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 18px;
      margin-top: 25px;
      margin-bottom: 15px;
      color: #1e40af;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .info-row {
      margin: 8px 0;
      font-size: 14px;
    }
    .label {
      font-weight: bold;
      display: inline-block;
      min-width: 100px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <h1>病历记录</h1>

  <h2>基本信息</h2>
  <div class="info-row"><span class="label">病历号:</span> ${medicalRecord.recordNo}</div>
  <div class="info-row"><span class="label">病历类型:</span> ${this.translateRecordType(medicalRecord.recordType)}</div>
  <div class="info-row"><span class="label">患者:</span> ${medicalRecord.patient?.name || '未知'} (${medicalRecord.patient?.idNumber || 'N/A'})</div>
  <div class="info-row"><span class="label">医生:</span> ${medicalRecord.doctor?.name || '未知'}</div>
  <div class="info-row"><span class="label">科室:</span> ${medicalRecord.doctor?.department?.name || '未知'}</div>
  <div class="info-row"><span class="label">创建时间:</span> ${new Date(medicalRecord.createdAt).toLocaleString('zh-CN')}</div>
  ${medicalRecord.isFinal ? '<div class="info-row"><span class="label">归档状态:</span> 已归档</div>' : ''}

  <h2>主诉和现病史</h2>
  <div class="info-row"><span class="label">主诉:</span> ${medicalRecord.chiefComplaint}</div>
  <div class="info-row"><span class="label">现病史:</span> ${medicalRecord.presentIllness}</div>

  ${medicalRecord.pastHistory || medicalRecord.familyHistory ? `
  <h2>病史</h2>
  ${medicalRecord.pastHistory ? `<div class="info-row"><span class="label">既往史:</span> ${medicalRecord.pastHistory}</div>` : ''}
  ${medicalRecord.familyHistory ? `<div class="info-row"><span class="label">家族史:</span> ${medicalRecord.familyHistory}</div>` : ''}
  ` : ''}

  ${medicalRecord.physicalExam || medicalRecord.auxiliaryExam ? `
  <h2>检查</h2>
  ${medicalRecord.physicalExam ? `<div class="info-row"><span class="label">体格检查:</span> ${medicalRecord.physicalExam}</div>` : ''}
  ${medicalRecord.auxiliaryExam ? `<div class="info-row"><span class="label">辅助检查:</span> ${medicalRecord.auxiliaryExam}</div>` : ''}
  ` : ''}

  <h2>诊断和治疗</h2>
  <div class="info-row"><span class="label">诊断:</span> ${medicalRecord.diagnosis}</div>
  <div class="info-row"><span class="label">治疗方案:</span> ${medicalRecord.treatmentPlan}</div>
  ${medicalRecord.followUpPlan ? `<div class="info-row"><span class="label">随访计划:</span> ${medicalRecord.followUpPlan}</div>` : ''}

  ${medicalRecord.aiSummary || medicalRecord.aiDiagnosticAdvice ? `
  <h2>AI智能辅助</h2>
  ${medicalRecord.aiSummary ? `<div class="info-row"><span class="label">AI摘要:</span> ${medicalRecord.aiSummary}</div>` : ''}
  ${medicalRecord.aiDiagnosticAdvice ? `<div class="info-row"><span class="label">AI诊断建议:</span> ${medicalRecord.aiDiagnosticAdvice}</div>` : ''}
  ` : ''}

  <div class="footer">
    <div>导出时间: ${new Date().toLocaleString('zh-CN')}</div>
    <div>由 AiliaoX 医疗系统生成</div>
  </div>
</body>
</html>
      `;

      // 使用puppeteer生成PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true
      });
      await browser.close();

      return Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error('导出PDF失败:', error);
      throw new Error('导出PDF失败');
    }
  }

  /**
   * 翻译病历类型为中文
   */
  private translateRecordType(type: RecordType): string {
    const typeMap: Partial<Record<RecordType, string>> = {
      OUTPATIENT: '门诊',
      INPATIENT: '住院',
      EMERGENCY: '急诊',
      PHYSICAL_EXAM: '体检'
    };
    return typeMap[type] || type;
  }
}
