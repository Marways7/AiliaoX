/**
 * 统计数据服务 - 里程碑7
 *
 * 功能:
 * - 多维度数据统计（患者、医生、科室、挂号、处方、病历）
 * - 数据聚合和分析
 * - 趋势数据计算
 * - 为Dashboard提供数据支持
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * 统计时间范围枚举
 */
export enum StatisticsTimeRange {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM'
}

/**
 * 自定义时间范围请求
 */
export interface CustomTimeRangeRequest {
  startDate: Date;
  endDate: Date;
}

/**
 * 患者统计数据
 */
export interface PatientStatistics {
  totalCount: number;
  newThisMonth: number;
  genderDistribution: { gender: string; count: number }[];
  ageDistribution: { ageGroup: string; count: number }[];
  bloodTypeDistribution: { bloodType: string; count: number }[];
  topDiseases: { disease: string; count: number }[];
}

/**
 * 医生统计数据
 */
export interface DoctorStatistics {
  totalCount: number;
  byDepartment: { department: string; count: number }[];
  byTitle: { title: string; count: number }[];
  topPerformers: {
    doctorId: string;
    doctorName: string;
    appointmentCount: number;
    prescriptionCount: number;
    medicalRecordCount: number;
  }[];
}

/**
 * 科室统计数据
 */
export interface DepartmentStatistics {
  totalCount: number;
  appointmentsByDepartment: { department: string; count: number }[];
  revenueByDepartment: { department: string; revenue: number }[];
  averageWaitTime: { department: string; avgWaitMinutes: number }[];
}

/**
 * 挂号统计数据
 */
export interface AppointmentStatistics {
  totalCount: number;
  todayCount: number;
  completedCount: number;
  cancelledCount: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byTimeSlot: { timeSlot: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
}

/**
 * 处方统计数据
 */
export interface PrescriptionStatistics {
  totalCount: number;
  totalRevenue: number;
  averageAmount: number;
  byStatus: { status: string; count: number }[];
  topMedicines: { medicine: string; count: number; revenue: number }[];
  monthlyRevenueTrend: { month: string; revenue: number }[];
}

/**
 * 病历统计数据
 */
export interface MedicalRecordStatistics {
  totalCount: number;
  byRecordType: { recordType: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  withAISummaryCount: number;
  finalizedCount: number;
  averageRecordsPerPatient: number;
}

/**
 * 综合Dashboard统计数据
 */
export interface DashboardStatistics {
  patients: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  appointments: {
    total: number;
    todayCount: number;
    pendingCount: number;
    completedCount: number;
  };
  prescriptions: {
    total: number;
    todayCount: number;
    totalRevenue: number;
    averageAmount: number;
  };
  medicalRecords: {
    total: number;
    todayCount: number;
    withAICount: number;
    finalizedCount: number;
  };
  doctors: {
    total: number;
    activeToday: number;
  };
  queue: {
    waitingCount: number;
    averageWaitTime: number;
  };
}

/**
 * 统计数据服务类
 */
export class StatisticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 获取时间范围的开始和结束日期
   */
  private getTimeRange(range: StatisticsTimeRange, customRange?: CustomTimeRangeRequest): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let startDate: Date;

    switch (range) {
      case StatisticsTimeRange.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case StatisticsTimeRange.WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case StatisticsTimeRange.MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case StatisticsTimeRange.QUARTER:
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
        break;
      case StatisticsTimeRange.YEAR:
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      case StatisticsTimeRange.CUSTOM:
        if (!customRange) {
          throw new Error('Custom range requires startDate and endDate');
        }
        startDate = customRange.startDate;
        return { startDate, endDate: customRange.endDate };
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  /**
   * 获取Dashboard综合统计数据
   */
  async getDashboardStatistics(): Promise<DashboardStatistics> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - 7);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // 患者统计（排除已软删除患者）
      const activePatientWhere = { deletedAt: null };
      const [totalPatients, newToday, newThisWeek, newThisMonth] = await Promise.all([
        this.prisma.patient.count({ where: activePatientWhere }),
        this.prisma.patient.count({ where: { ...activePatientWhere, createdAt: { gte: today } } }),
        this.prisma.patient.count({ where: { ...activePatientWhere, createdAt: { gte: thisWeekStart } } }),
        this.prisma.patient.count({ where: { ...activePatientWhere, createdAt: { gte: thisMonthStart } } })
      ]);

      // 挂号统计
      const [totalAppointments, todayAppointments, pendingAppointments, completedAppointments] = await Promise.all([
        this.prisma.appointment.count(),
        this.prisma.appointment.count({ where: { appointmentDate: { gte: today } } }),
        this.prisma.appointment.count({ where: { status: 'PENDING' } }),
        this.prisma.appointment.count({ where: { status: 'COMPLETED' } })
      ]);

      // 处方统计
      const [totalPrescriptions, todayPrescriptions, prescriptionRevenue] = await Promise.all([
        this.prisma.prescription.count(),
        this.prisma.prescription.count({ where: { createdAt: { gte: today } } }),
        this.prisma.prescription.aggregate({
          _sum: { totalAmount: true }
        })
      ]);

      const avgPrescriptionAmount = totalPrescriptions > 0
        ? (prescriptionRevenue._sum.totalAmount?.toNumber() || 0) / totalPrescriptions
        : 0;

      // 病历统计
      const [totalRecords, todayRecords, aiRecords, finalizedRecords] = await Promise.all([
        this.prisma.medicalRecord.count(),
        this.prisma.medicalRecord.count({ where: { createdAt: { gte: today } } }),
        this.prisma.medicalRecord.count({ where: { aiSummary: { not: null } } }),
        this.prisma.medicalRecord.count({ where: { isFinal: true } })
      ]);

      // 医生统计
      const totalDoctors = await this.prisma.doctor.count();
      const activeDoctorsToday = await this.prisma.appointment.groupBy({
        by: ['doctorId'],
        where: { appointmentDate: { gte: today } }
      });

      // 排队统计
      const waitingQueues = await this.prisma.queue.count({ where: { status: 'WAITING' } });
      const avgWaitTime = 15; // 简化计算，实际应基于历史数据

      return {
        patients: {
          total: totalPatients,
          newToday,
          newThisWeek,
          newThisMonth
        },
        appointments: {
          total: totalAppointments,
          todayCount: todayAppointments,
          pendingCount: pendingAppointments,
          completedCount: completedAppointments
        },
        prescriptions: {
          total: totalPrescriptions,
          todayCount: todayPrescriptions,
          totalRevenue: prescriptionRevenue._sum.totalAmount?.toNumber() || 0,
          averageAmount: avgPrescriptionAmount
        },
        medicalRecords: {
          total: totalRecords,
          todayCount: todayRecords,
          withAICount: aiRecords,
          finalizedCount: finalizedRecords
        },
        doctors: {
          total: totalDoctors,
          activeToday: activeDoctorsToday.length
        },
        queue: {
          waitingCount: waitingQueues,
          averageWaitTime: avgWaitTime
        }
      };
    } catch (error) {
      logger.error('获取Dashboard统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取患者统计数据
   */
  async getPatientStatistics(_timeRange: StatisticsTimeRange = StatisticsTimeRange.MONTH, _customRange?: CustomTimeRangeRequest): Promise<PatientStatistics> {
    try {
      // 患者统计不使用时间范围筛选，返回全局统计
      // const { startDate, endDate } = this.getTimeRange(timeRange, customRange);

      // 总患者数
      const totalCount = await this.prisma.patient.count();

      // 本月新增患者数
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const newThisMonth = await this.prisma.patient.count({
        where: { createdAt: { gte: thisMonthStart } }
      });

      // 性别分布
      const genderDistribution = await this.prisma.patient.groupBy({
        by: ['gender'],
        _count: true
      });

      // 年龄分布（简化版：按年龄段分组）
      const allPatients = await this.prisma.patient.findMany({
        select: { birthDate: true }
      });

      const ageGroups = {
        '0-18': 0,
        '19-35': 0,
        '36-50': 0,
        '51-65': 0,
        '65+': 0
      };

      const now = new Date();
      allPatients.forEach(patient => {
        const age = Math.floor((now.getTime() - patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      });

      const ageDistribution = Object.entries(ageGroups).map(([ageGroup, count]) => ({ ageGroup, count }));

      // 血型分布
      const bloodTypeDistribution = await this.prisma.patient.groupBy({
        by: ['bloodType'],
        _count: true,
        where: { bloodType: { not: null } }
      });

      // 高频疾病（从病历诊断中提取）
      const topDiseases = await this.prisma.medicalRecord.groupBy({
        by: ['diagnosis'],
        _count: true,
        orderBy: { _count: { diagnosis: 'desc' } },
        take: 10
      });

      return {
        totalCount,
        newThisMonth,
        genderDistribution: genderDistribution.map(item => ({
          gender: item.gender,
          count: item._count
        })),
        ageDistribution,
        bloodTypeDistribution: bloodTypeDistribution.map(item => ({
          bloodType: item.bloodType || '未知',
          count: item._count
        })),
        topDiseases: topDiseases.map(item => ({
          disease: item.diagnosis,
          count: item._count
        }))
      };
    } catch (error) {
      logger.error('获取患者统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取医生统计数据
   */
  async getDoctorStatistics(): Promise<DoctorStatistics> {
    try {
      const totalCount = await this.prisma.doctor.count();

      // 按科室分布
      const byDepartment = await this.prisma.doctor.groupBy({
        by: ['departmentId'],
        _count: true
      });

      // 获取科室名称
      const departments = await this.prisma.department.findMany();
      const deptMap = new Map(departments.map(d => [d.id, d.name]));

      const departmentDistribution = byDepartment.map(item => ({
        department: deptMap.get(item.departmentId) || '未知',
        count: item._count
      }));

      // 按职称分布
      const byTitle = await this.prisma.doctor.groupBy({
        by: ['title'],
        _count: true
      });

      const titleDistribution = byTitle.map(item => ({
        title: item.title || '未知',
        count: item._count
      }));

      // 获取Top医生（基于挂号量、处方量、病历量）
      const doctors = await this.prisma.doctor.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              appointments: true,
              prescriptions: true,
              medicalRecords: true
            }
          }
        },
        orderBy: {
          appointments: {
            _count: 'desc'
          }
        }
      });

      const topPerformers = doctors.map(doctor => ({
        doctorId: doctor.id,
        doctorName: doctor.name,
        appointmentCount: doctor._count.appointments,
        prescriptionCount: doctor._count.prescriptions,
        medicalRecordCount: doctor._count.medicalRecords
      }));

      return {
        totalCount,
        byDepartment: departmentDistribution,
        byTitle: titleDistribution,
        topPerformers
      };
    } catch (error) {
      logger.error('获取医生统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取科室统计数据
   */
  async getDepartmentStatistics(): Promise<DepartmentStatistics> {
    try {
      const totalCount = await this.prisma.department.count();

      // 获取所有科室
      const departments = await this.prisma.department.findMany();

      // 按科室统计挂号量
      const appointmentsByDept = await Promise.all(
        departments.map(async dept => {
          const count = await this.prisma.appointment.count({
            where: {
              doctor: {
                departmentId: dept.id
              }
            }
          });
          return { department: dept.name, count };
        })
      );

      // 按科室统计收入（处方总金额）
      const revenueByDept = await Promise.all(
        departments.map(async dept => {
          const revenue = await this.prisma.prescription.aggregate({
            _sum: { totalAmount: true },
            where: {
              doctor: {
                departmentId: dept.id
              }
            }
          });
          return {
            department: dept.name,
            revenue: revenue._sum.totalAmount?.toNumber() || 0
          };
        })
      );

      // 平均等待时间（简化计算）
      const averageWaitTime = departments.map(dept => ({
        department: dept.name,
        avgWaitMinutes: 15 // 简化，实际应基于queue数据计算
      }));

      return {
        totalCount,
        appointmentsByDepartment: appointmentsByDept.sort((a, b) => b.count - a.count),
        revenueByDepartment: revenueByDept.sort((a, b) => b.revenue - a.revenue),
        averageWaitTime
      };
    } catch (error) {
      logger.error('获取科室统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取挂号统计数据
   */
  async getAppointmentStatistics(timeRange: StatisticsTimeRange = StatisticsTimeRange.MONTH, customRange?: CustomTimeRangeRequest): Promise<AppointmentStatistics> {
    try {
      const { startDate, endDate } = this.getTimeRange(timeRange, customRange);

      const totalCount = await this.prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await this.prisma.appointment.count({
        where: { appointmentDate: { gte: today } }
      });

      // 按状态统计
      const byStatus = await this.prisma.appointment.groupBy({
        by: ['status'],
        _count: true,
        where: {
          appointmentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const completedCount = byStatus.find(s => s.status === 'COMPLETED')?._count || 0;
      const cancelledCount = byStatus.find(s => s.status === 'CANCELLED')?._count || 0;

      // 按优先级统计
      const byPriority = await this.prisma.appointment.groupBy({
        by: ['priority'],
        _count: true,
        where: {
          appointmentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // 按时间段统计
      const byTimeSlot = await this.prisma.appointment.groupBy({
        by: ['timeSlot'],
        _count: true,
        where: {
          appointmentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // 每日趋势（最近7天）
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date;
      });

      const dailyTrend = await Promise.all(
        last7Days.map(async date => {
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          const count = await this.prisma.appointment.count({
            where: {
              appointmentDate: {
                gte: dayStart,
                lte: dayEnd
              }
            }
          });

          return {
            date: date.toISOString().split('T')[0],
            count
          };
        })
      );

      return {
        totalCount,
        todayCount,
        completedCount,
        cancelledCount,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
        byTimeSlot: byTimeSlot.map(t => ({ timeSlot: t.timeSlot, count: t._count })),
        dailyTrend
      };
    } catch (error) {
      logger.error('获取挂号统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取处方统计数据
   */
  async getPrescriptionStatistics(timeRange: StatisticsTimeRange = StatisticsTimeRange.MONTH, customRange?: CustomTimeRangeRequest): Promise<PrescriptionStatistics> {
    try {
      const { startDate, endDate } = this.getTimeRange(timeRange, customRange);

      const totalCount = await this.prisma.prescription.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const revenueData = await this.prisma.prescription.aggregate({
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalRevenue = revenueData._sum.totalAmount?.toNumber() || 0;
      const averageAmount = revenueData._avg.totalAmount?.toNumber() || 0;

      // 按状态统计
      const byStatus = await this.prisma.prescription.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Top药品（从prescription_items中统计）
      const topMedicinesData = await this.prisma.prescriptionItem.groupBy({
        by: ['medicineId'],
        _count: true,
        _sum: { quantity: true },
        orderBy: { _count: { medicineId: 'desc' } },
        take: 10
      });

      const medicineIds = topMedicinesData.map(item => item.medicineId);
      const medicines = await this.prisma.medicine.findMany({
        where: { id: { in: medicineIds } },
        select: { id: true, name: true, price: true }
      });

      const medicineMap = new Map(medicines.map(m => [m.id, { name: m.name, price: m.price }]));

      const topMedicines = topMedicinesData.map(item => {
        const medicine = medicineMap.get(item.medicineId);
        const quantity = item._sum.quantity || 0;
        const price = medicine?.price.toNumber() || 0;
        return {
          medicine: medicine?.name || '未知',
          count: item._count,
          revenue: quantity * price
        };
      });

      // 月度收入趋势（最近6个月）
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        return date;
      });

      const monthlyRevenueTrend = await Promise.all(
        last6Months.map(async date => {
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

          const monthRevenue = await this.prisma.prescription.aggregate({
            _sum: { totalAmount: true },
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd
              }
            }
          });

          return {
            month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            revenue: monthRevenue._sum.totalAmount?.toNumber() || 0
          };
        })
      );

      return {
        totalCount,
        totalRevenue,
        averageAmount,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        topMedicines,
        monthlyRevenueTrend
      };
    } catch (error) {
      logger.error('获取处方统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取病历统计数据
   */
  async getMedicalRecordStatistics(timeRange: StatisticsTimeRange = StatisticsTimeRange.MONTH, customRange?: CustomTimeRangeRequest): Promise<MedicalRecordStatistics> {
    try {
      const { startDate, endDate } = this.getTimeRange(timeRange, customRange);

      const totalCount = await this.prisma.medicalRecord.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // 按病历类型统计
      const byRecordType = await this.prisma.medicalRecord.groupBy({
        by: ['recordType'],
        _count: true,
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // 按科室统计
      const byDeptData = await this.prisma.medicalRecord.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          doctor: {
            select: {
              department: {
                select: { name: true }
              }
            }
          }
        }
      });

      const deptCount = new Map<string, number>();
      byDeptData.forEach(record => {
        const deptName = record.doctor.department.name;
        deptCount.set(deptName, (deptCount.get(deptName) || 0) + 1);
      });

      const byDepartment = Array.from(deptCount.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      // 包含AI摘要的病历数
      const withAISummaryCount = await this.prisma.medicalRecord.count({
        where: {
          aiSummary: { not: null },
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // 已归档病历数
      const finalizedCount = await this.prisma.medicalRecord.count({
        where: {
          isFinal: true,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // 平均每个患者的病历数
      const patientCount = await this.prisma.patient.count();
      const allRecordsCount = await this.prisma.medicalRecord.count();
      const averageRecordsPerPatient = patientCount > 0 ? allRecordsCount / patientCount : 0;

      return {
        totalCount,
        byRecordType: byRecordType.map(r => ({ recordType: r.recordType, count: r._count })),
        byDepartment,
        withAISummaryCount,
        finalizedCount,
        averageRecordsPerPatient
      };
    } catch (error) {
      logger.error('获取病历统计数据失败:', error);
      throw error;
    }
  }
}
