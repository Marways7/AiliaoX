/**
 * 患者信息管理服务
 *
 * 功能：
 * - 患者CRUD操作
 * - 患者搜索和筛选
 * - 患者病历历史查询
 * - 患者统计信息
 */

import { PrismaClient, Patient, Gender, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreatePatientInput {
  name: string;
  gender: Gender;
  birthDate: Date;
  idCard?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  allergies?: string;
  medicalHistory?: string;
}

export interface UpdatePatientInput {
  name?: string;
  gender?: Gender;
  birthDate?: Date;
  idCard?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  allergies?: string;
  medicalHistory?: string;
}

export interface PatientSearchParams {
  keyword?: string; // 姓名、身份证、电话模糊搜索
  gender?: Gender;
  ageMin?: number;
  ageMax?: number;
  bloodType?: string;
  hasAllergies?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface PatientStatistics {
  totalPatients: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  ageDistribution: {
    under18: number;
    age18to40: number;
    age41to60: number;
    over60: number;
  };
  bloodTypeDistribution: Record<string, number>;
  patientsWithAllergies: number;
  recentRegistrations: number; // 最近30天
}

/**
 * 患者信息管理服务类
 */
export class PatientService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 生成患者编号
   * 格式：P + YYYYMMDD + 4位序号
   */
  private async generatePatientNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 查询当天最后一个患者编号
    const lastPatient = await this.prisma.patient.findFirst({
      where: {
        patientNo: {
          startsWith: `P${dateStr}`
        }
      },
      orderBy: {
        patientNo: 'desc'
      }
    });

    let sequence = 1;
    if (lastPatient) {
      const lastSequence = parseInt(lastPatient.patientNo.slice(-4));
      sequence = lastSequence + 1;
    }

    return `P${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * 计算年龄
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * 创建患者
   */
  async createPatient(input: CreatePatientInput): Promise<Patient> {
    try {
      const patientNo = await this.generatePatientNo();

      const patient = await this.prisma.patient.create({
        data: {
          patientNo,
          ...input
        }
      });

      logger.info(`创建患者成功: ${patient.patientNo} - ${patient.name}`);
      return patient;
    } catch (error) {
      logger.error('创建患者失败:', error);
      throw new Error('创建患者失败');
    }
  }

  /**
   * 根据ID获取患者详情
   */
  async getPatientById(id: string): Promise<Patient | null> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id },
        include: {
          patientTags: true,
          appointments: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              doctor: {
                select: {
                  name: true,
                  title: true
                }
              },
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      return patient;
    } catch (error) {
      logger.error('获取患者详情失败:', error);
      throw new Error('获取患者详情失败');
    }
  }

  /**
   * 根据患者编号获取患者
   */
  async getPatientByNo(patientNo: string): Promise<Patient | null> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { patientNo }
      });

      return patient;
    } catch (error) {
      logger.error('根据编号获取患者失败:', error);
      throw new Error('根据编号获取患者失败');
    }
  }

  /**
   * 更新患者信息
   */
  async updatePatient(id: string, input: UpdatePatientInput): Promise<Patient> {
    try {
      const patient = await this.prisma.patient.update({
        where: { id },
        data: {
          ...input,
          updatedAt: new Date()
        }
      });

      logger.info(`更新患者成功: ${patient.patientNo} - ${patient.name}`);
      return patient;
    } catch (error) {
      logger.error('更新患者失败:', error);
      throw new Error('更新患者失败');
    }
  }

  /**
   * 删除患者（软删除）
   */
  async deletePatient(id: string): Promise<boolean> {
    try {
      await this.prisma.patient.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });

      logger.info(`删除患者成功: ID ${id}`);
      return true;
    } catch (error) {
      logger.error('删除患者失败:', error);
      throw new Error('删除患者失败');
    }
  }

  /**
   * 搜索和筛选患者
   */
  async searchPatients(params: PatientSearchParams): Promise<{
    patients: Patient[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        keyword,
        gender,
        ageMin,
        ageMax,
        bloodType,
        hasAllergies,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      // 构建查询条件
      const where: Prisma.PatientWhereInput = {
        deletedAt: null // 不包含已删除的患者
      };

      // 关键词搜索（姓名、电话）
      if (keyword) {
        where.OR = [
          { name: { contains: keyword } },
          { phone: { contains: keyword } }
        ];
      }

      // 性别筛选
      if (gender) {
        where.gender = gender;
      }

      // 血型筛选
      if (bloodType) {
        where.bloodType = bloodType;
      }

      // 过敏史筛选
      if (hasAllergies !== undefined) {
        if (hasAllergies) {
          where.allergies = { not: null };
        } else {
          where.allergies = null;
        }
      }

      // 年龄筛选需要先查询所有患者再过滤（由于Prisma不支持直接计算年龄）
      let patients = await this.prisma.patient.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder
        }
      });

      // 应用年龄筛选
      if (ageMin !== undefined || ageMax !== undefined) {
        patients = patients.filter(patient => {
          const age = this.calculateAge(new Date(patient.birthDate));
          if (ageMin !== undefined && age < ageMin) return false;
          if (ageMax !== undefined && age > ageMax) return false;
          return true;
        });
      }

      // 分页
      const total = patients.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPatients = patients.slice(startIndex, endIndex);

      return {
        patients: paginatedPatients,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('搜索患者失败:', error);
      throw new Error('搜索患者失败');
    }
  }

  /**
   * 获取患者病历历史
   */
  async getPatientMedicalRecords(patientId: string, limit: number = 20): Promise<any[]> {
    try {
      const records = await this.prisma.medicalRecord.findMany({
        where: {
          patientId
        },
        include: {
          doctor: {
            select: {
              name: true,
              title: true
            }
          },
          appointment: {
            select: {
              appointmentDate: true,
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return records;
    } catch (error) {
      logger.error('获取患者病历历史失败:', error);
      throw new Error('获取患者病历历史失败');
    }
  }

  /**
   * 获取患者统计信息
   */
  async getPatientStatistics(patientId: string): Promise<any> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          appointments: true,
          medicalRecords: true,
          prescriptions: true
        }
      });

      if (!patient) {
        throw new Error('患者不存在');
      }

      const age = this.calculateAge(new Date(patient.birthDate));

      return {
        patientInfo: {
          id: patient.id,
          patientNo: patient.patientNo,
          name: patient.name,
          gender: patient.gender,
          age,
          bloodType: patient.bloodType,
          allergies: patient.allergies
        },
        statistics: {
          totalAppointments: patient.appointments.length,
          totalMedicalRecords: patient.medicalRecords.length,
          totalPrescriptions: patient.prescriptions.length,
          lastVisit: patient.appointments[0]?.createdAt || null
        }
      };
    } catch (error) {
      logger.error('获取患者统计信息失败:', error);
      throw new Error('获取患者统计信息失败');
    }
  }

  /**
   * 获取全局患者统计
   */
  async getGlobalStatistics(): Promise<PatientStatistics> {
    try {
      const allPatients = await this.prisma.patient.findMany({
        where: {
          deletedAt: null
        }
      });

      const totalPatients = allPatients.length;

      // 性别分布
      const genderDistribution = {
        male: allPatients.filter(p => p.gender === Gender.MALE).length,
        female: allPatients.filter(p => p.gender === Gender.FEMALE).length,
        other: allPatients.filter(p => p.gender === Gender.OTHER).length
      };

      // 年龄分布
      const ageDistribution = {
        under18: 0,
        age18to40: 0,
        age41to60: 0,
        over60: 0
      };

      allPatients.forEach(patient => {
        const age = this.calculateAge(new Date(patient.birthDate));
        if (age < 18) ageDistribution.under18++;
        else if (age <= 40) ageDistribution.age18to40++;
        else if (age <= 60) ageDistribution.age41to60++;
        else ageDistribution.over60++;
      });

      // 血型分布
      const bloodTypeDistribution: Record<string, number> = {};
      allPatients.forEach(patient => {
        if (patient.bloodType) {
          bloodTypeDistribution[patient.bloodType] = (bloodTypeDistribution[patient.bloodType] || 0) + 1;
        }
      });

      // 有过敏史的患者数
      const patientsWithAllergies = allPatients.filter(p => p.allergies && p.allergies.trim() !== '').length;

      // 最近30天新增患者
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentRegistrations = allPatients.filter(p => new Date(p.createdAt) >= thirtyDaysAgo).length;

      return {
        totalPatients,
        genderDistribution,
        ageDistribution,
        bloodTypeDistribution,
        patientsWithAllergies,
        recentRegistrations
      };
    } catch (error) {
      logger.error('获取全局统计信息失败:', error);
      throw new Error('获取全局统计信息失败');
    }
  }

  /**
   * 为患者添加标签
   */
  async addPatientTag(patientId: string, tag: string, color?: string): Promise<any> {
    try {
      const patientTag = await this.prisma.patientTag.create({
        data: {
          patientId,
          tag,
          color: color || '#3B82F6'
        }
      });

      logger.info(`为患者添加标签成功: 患者ID ${patientId}, 标签 ${tag}`);
      return patientTag;
    } catch (error) {
      logger.error('添加患者标签失败:', error);
      throw new Error('添加患者标签失败');
    }
  }

  /**
   * 删除患者标签
   */
  async removePatientTag(patientId: string, tag: string): Promise<boolean> {
    try {
      await this.prisma.patientTag.deleteMany({
        where: {
          patientId,
          tag
        }
      });

      logger.info(`删除患者标签成功: 患者ID ${patientId}, 标签 ${tag}`);
      return true;
    } catch (error) {
      logger.error('删除患者标签失败:', error);
      throw new Error('删除患者标签失败');
    }
  }
}