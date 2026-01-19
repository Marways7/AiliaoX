/**
 * 挂号管理服务
 *
 * 功能：
 * - 患者挂号（选科室、选医生、选时间段）
 * - 挂号号码自动生成
 * - 挂号历史查询
 * - 挂号状态管理
 * - 挂号统计
 */

import { PrismaClient, Appointment, AppointmentStatus, TimeSlot, Priority } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  departmentId: string;
  appointmentDate: Date;
  timeSlot: TimeSlot;
  symptoms?: string;
  priority?: Priority;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus;
  actualVisitTime?: Date;
  notes?: string;
}

export interface AppointmentSearchParams {
  patientId?: string;
  doctorId?: string;
  departmentId?: string;
  status?: AppointmentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  priority?: Priority;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 挂号管理服务类
 */
export class AppointmentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 生成挂号号码
   * 格式：科室代码 + 日期(YYYYMMDD) + 4位序号
   * 例如：NEI2025100100001（内科 2025年10月1日 第1号）
   */
  private async generateAppointmentNo(departmentId: string, appointmentDate: Date): Promise<string> {
    try {
      // 获取科室信息
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId }
      });

      if (!department) {
        throw new Error('科室不存在');
      }

      // 获取科室代码（使用departmentNo字段）
      const deptCode = department.departmentNo.substring(0, 3).toUpperCase();

      // 格式化日期
      const dateStr = appointmentDate.toISOString().slice(0, 10).replace(/-/g, '');

      // 查询当天该科室的最后一个挂号号码
      const lastAppointment = await this.prisma.appointment.findFirst({
        where: {
          departmentId,
          appointmentDate: {
            gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
            lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1)
          }
        },
        orderBy: { appointmentNo: 'desc' }
      });

      let sequence = 1;
      if (lastAppointment && lastAppointment.appointmentNo) {
        // 提取序号并加1
        const lastSequence = parseInt(lastAppointment.appointmentNo.slice(-5));
        sequence = lastSequence + 1;
      }

      return `${deptCode}${dateStr}${sequence.toString().padStart(5, '0')}`;
    } catch (error) {
      logger.error('生成挂号号码失败:', error);
      throw new Error('生成挂号号码失败');
    }
  }

  /**
   * 创建挂号
   */
  async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    try {
      // 验证患者是否存在
      const patient = await this.prisma.patient.findUnique({
        where: { id: input.patientId }
      });
      if (!patient) {
        throw new Error('患者不存在');
      }

      // 验证医生是否存在
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: input.doctorId }
      });
      if (!doctor) {
        throw new Error('医生不存在');
      }

      // 验证科室是否存在
      const department = await this.prisma.department.findUnique({
        where: { id: input.departmentId }
      });
      if (!department) {
        throw new Error('科室不存在');
      }

      // 检查时间段是否已被占用
      const existingAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          appointmentDate: input.appointmentDate,
          timeSlot: input.timeSlot,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
          }
        }
      });

      if (existingAppointment) {
        throw new Error('该时间段已被预约');
      }

      // 生成挂号号码和排队号
      const appointmentNo = await this.generateAppointmentNo(input.departmentId, input.appointmentDate);
      const queueNumber = await this.generateQueueNumber(input.departmentId);

      // 创建挂号记录
      const appointment = await this.prisma.appointment.create({
        data: {
          appointmentNo,
          patientId: input.patientId,
          doctorId: input.doctorId,
          departmentId: input.departmentId,
          appointmentDate: input.appointmentDate,
          timeSlot: input.timeSlot,
          queueNumber,
          symptoms: input.symptoms,
          priority: input.priority || Priority.NORMAL,
          status: input.priority === Priority.EMERGENCY ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING
        },
        include: {
          patient: true,
          doctor: {
            include: {
              user: true
            }
          },
          department: true
        }
      });

      logger.info(`挂号创建成功: ${appointmentNo} - 患者: ${patient.name}, 医生ID: ${input.doctorId}`);
      return appointment;
    } catch (error) {
      logger.error('创建挂号失败:', error);
      throw error;
    }
  }

  /**
   * 生成排队号码
   * 格式：当天的顺序号
   */
  private async generateQueueNumber(departmentId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const lastAppointment = await this.prisma.appointment.findFirst({
        where: {
          departmentId,
          appointmentDate: {
            gte: today,
            lt: tomorrow
          }
        },
        orderBy: { queueNumber: 'desc' }
      });

      return lastAppointment ? lastAppointment.queueNumber + 1 : 1;
    } catch (error) {
      logger.error('创建挂号失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取挂号详情
   */
  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: true,
          doctor: true,
          department: true
        }
      });

      return appointment;
    } catch (error) {
      logger.error('获取挂号详情失败:', error);
      throw new Error('获取挂号详情失败');
    }
  }

  /**
   * 根据挂号号码获取挂号详情
   */
  async getAppointmentByNo(appointmentNo: string): Promise<Appointment | null> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { appointmentNo },
        include: {
          patient: true,
          doctor: true,
          department: true
        }
      });

      return appointment;
    } catch (error) {
      logger.error('获取挂号详情失败:', error);
      throw new Error('获取挂号详情失败');
    }
  }

  /**
   * 更新挂号信息
   */
  async updateAppointment(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id }
      });

      if (!appointment) {
        throw new Error('挂号记录不存在');
      }

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: input,
        include: {
          patient: true,
          doctor: true,
          department: true
        }
      });

      logger.info(`挂号更新成功: ${appointment.appointmentNo}`);
      return updatedAppointment;
    } catch (error) {
      logger.error('更新挂号失败:', error);
      throw error;
    }
  }

  /**
   * 取消挂号
   */
  async cancelAppointment(id: string): Promise<Appointment> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id }
      });

      if (!appointment) {
        throw new Error('挂号记录不存在');
      }

      if (appointment.status === AppointmentStatus.COMPLETED) {
        throw new Error('已完成的挂号不能取消');
      }

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new Error('挂号已经被取消');
      }

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED },
        include: {
          patient: true,
          doctor: true,
          department: true
        }
      });

      logger.info(`挂号取消成功: ${appointment.appointmentNo}`);
      return updatedAppointment;
    } catch (error) {
      logger.error('取消挂号失败:', error);
      throw error;
    }
  }

  /**
   * 搜索和筛选挂号记录
   */
  async searchAppointments(params: AppointmentSearchParams): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        patientId,
        doctorId,
        departmentId,
        status,
        dateFrom,
        dateTo,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'appointmentDate',
        sortOrder = 'desc'
      } = params;

      // 构建查询条件
      const where: any = {};

      if (patientId) {
        where.patientId = patientId;
      }

      if (doctorId) {
        where.doctorId = doctorId;
      }

      if (departmentId) {
        where.departmentId = departmentId;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.appointmentDate = {};
        if (dateFrom) {
          where.appointmentDate.gte = dateFrom;
        }
        if (dateTo) {
          where.appointmentDate.lte = dateTo;
        }
      }

      if (priority !== undefined) {
        where.priority = priority;
      }

      // 查询总数
      const total = await this.prisma.appointment.count({ where });

      // 查询数据
      const appointments = await this.prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          doctor: true,
          department: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      });

      const totalPages = Math.ceil(total / limit);

      return {
        appointments,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('搜索挂号失败:', error);
      throw new Error('搜索挂号失败');
    }
  }

  /**
   * 获取患者挂号历史
   */
  async getPatientAppointmentHistory(
    patientId: string,
    limit: number = 20
  ): Promise<Appointment[]> {
    try {
      const appointments = await this.prisma.appointment.findMany({
        where: { patientId },
        include: {
          doctor: true,
          department: true
        },
        orderBy: { appointmentDate: 'desc' },
        take: limit
      });

      return appointments;
    } catch (error) {
      logger.error('获取患者挂号历史失败:', error);
      throw new Error('获取患者挂号历史失败');
    }
  }

  /**
   * 获取医生挂号列表
   */
  async getDoctorAppointments(
    doctorId: string,
    date: Date,
    status?: AppointmentStatus
  ): Promise<Appointment[]> {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const where: any = {
        doctorId,
        appointmentDate: {
          gte: startOfDay,
          lt: endOfDay
        }
      };

      if (status) {
        where.status = status;
      }

      const appointments = await this.prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          department: true
        },
        orderBy: { timeSlot: 'asc' }
      });

      return appointments;
    } catch (error) {
      logger.error('获取医生挂号列表失败:', error);
      throw new Error('获取医生挂号列表失败');
    }
  }

  /**
   * 获取科室挂号统计
   */
  async getDepartmentStatistics(departmentId: string, date: Date): Promise<{
    totalAppointments: number;
    pendingAppointments: number;
    confirmedAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    emergencyAppointments: number;
  }> {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const [
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
        emergencyAppointments
      ] = await Promise.all([
        this.prisma.appointment.count({
          where: {
            departmentId,
            appointmentDate: { gte: startOfDay, lt: endOfDay }
          }
        }),
        this.prisma.appointment.count({
          where: {
            departmentId,
            appointmentDate: { gte: startOfDay, lt: endOfDay },
            status: AppointmentStatus.PENDING
          }
        }),
        this.prisma.appointment.count({
          where: {
            departmentId,
            appointmentDate: { gte: startOfDay, lt: endOfDay },
            status: AppointmentStatus.CONFIRMED
          }
        }),
        this.prisma.appointment.count({
          where: {
            departmentId,
            appointmentDate: { gte: startOfDay, lt: endOfDay },
            status: AppointmentStatus.COMPLETED
          }
        }),
        this.prisma.appointment.count({
          where: {
            departmentId,
            appointmentDate: { gte: startOfDay, lt: endOfDay },
            status: AppointmentStatus.CANCELLED
          }
        }),
        this.prisma.appointment.count({
          where: {
            departmentId,
            appointmentDate: { gte: startOfDay, lt: endOfDay },
            priority: Priority.EMERGENCY
          }
        })
      ]);

      return {
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
        emergencyAppointments
      };
    } catch (error) {
      logger.error('获取科室挂号统计失败:', error);
      throw new Error('获取科室挂号统计失败');
    }
  }

  /**
   * 获取挂号统计信息（通用统计）
   */
  async getOverallStatistics(params: {
    startDate?: Date;
    endDate?: Date;
    department?: string;
  }): Promise<{
    totalCount: number;
    pendingCount: number;
    completedCount: number;
    cancelledCount: number;
    departmentStats: Array<{
      department: string;
      count: number;
    }>;
  }> {
    try {
      const { startDate, endDate, department } = params;

      // 构建where条件
      const whereCondition: any = {};
      if (startDate || endDate) {
        whereCondition.appointmentDate = {};
        if (startDate) {
          whereCondition.appointmentDate.gte = startDate;
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          whereCondition.appointmentDate.lte = endOfDay;
        }
      }
      if (department) {
        whereCondition.departmentId = department;
      }

      // 获取总数和状态统计
      const [totalCount, pendingCount, completedCount, cancelledCount] = await Promise.all([
        this.prisma.appointment.count({ where: whereCondition }),
        this.prisma.appointment.count({
          where: { ...whereCondition, status: AppointmentStatus.PENDING }
        }),
        this.prisma.appointment.count({
          where: { ...whereCondition, status: AppointmentStatus.COMPLETED }
        }),
        this.prisma.appointment.count({
          where: { ...whereCondition, status: AppointmentStatus.CANCELLED }
        })
      ]);

      // 获取各科室统计
      const appointmentsWithDept = await this.prisma.appointment.findMany({
        where: whereCondition,
        select: {
          departmentId: true
        }
      });

      // 统计各科室数量
      const deptCountMap = new Map<string, number>();
      appointmentsWithDept.forEach((appt) => {
        const count = deptCountMap.get(appt.departmentId) || 0;
        deptCountMap.set(appt.departmentId, count + 1);
      });

      const departmentStats = Array.from(deptCountMap.entries()).map(([dept, count]) => ({
        department: dept,
        count
      }));

      return {
        totalCount,
        pendingCount,
        completedCount,
        cancelledCount,
        departmentStats
      };
    } catch (error) {
      logger.error('获取挂号统计信息失败:', error);
      throw new Error('获取挂号统计信息失败');
    }
  }

  /**
   * 检查医生时间段可用性
   */
  async checkTimeSlotAvailability(
    doctorId: string,
    appointmentDate: Date,
    timeSlot: TimeSlot
  ): Promise<boolean> {
    try {
      const existingAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId,
          appointmentDate,
          timeSlot,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
          }
        }
      });

      return !existingAppointment;
    } catch (error) {
      logger.error('检查时间段可用性失败:', error);
      throw new Error('检查时间段可用性失败');
    }
  }
}
