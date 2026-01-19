/**
 * 排队管理服务
 *
 * 功能：
 * - 智能排队算法（优先级、急诊插队）
 * - 排队号码自动生成
 * - 叫号管理
 * - 排队状态管理
 * - 排队位置和预计等待时间
 * - 排队统计
 */

import { PrismaClient, Queue, QueueStatus, Priority, AppointmentStatus } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateQueueInput {
  appointmentId: string;
  autoCheckIn?: boolean;
}

export interface QueueWithDetails extends Queue {
  appointment: {
    patient: {
      name: string;
      patientNo: string;
    };
    department: {
      name: string;
    };
    doctor: {
      user: {
        username: string;
      };
    };
    priority: Priority;
  };
}

/**
 * 排队管理服务类
 */
export class QueueService {
  private prisma: PrismaClient;
  private readonly DEFAULT_CONSULTATION_TIME = 15; // 默认就诊时间（分钟）

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建排队记录
   */
  async createQueue({ appointmentId, autoCheckIn = true }: CreateQueueInput): Promise<QueueWithDetails> {
    try {
      // 验证挂号是否存在
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
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

      if (!appointment) {
        throw new Error('挂号记录不存在');
      }

      // 检查是否已存在排队记录
      const existingQueue = await this.prisma.queue.findUnique({
        where: { appointmentId }
      });

      if (existingQueue) {
        throw new Error('该挂号已经在排队中');
      }

      // 计算预计就诊时间
      const estimatedTime = await this.calculateEstimatedTime(appointment.doctorId);

      // 创建排队记录
      const queue = await this.prisma.queue.create({
        data: {
          appointmentId,
          queueNumber: appointment.queueNumber,
          status: QueueStatus.WAITING,
          estimatedTime
        },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
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

      if (autoCheckIn) {
        // 更新挂号状态为已签到
        await this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: AppointmentStatus.CHECKED_IN,
            checkedInAt: new Date()
          }
        });
        logger.info(`排队创建成功 - 排队号: ${queue.queueNumber}, 患者: ${appointment.patient.name}`);
      } else {
        logger.info(`挂号创建后自动加入队列 - 排队号: ${queue.queueNumber}, 患者: ${appointment.patient.name}`);
      }

      return queue as QueueWithDetails;
    } catch (error) {
      logger.error('创建排队记录失败:', error);
      throw error;
    }
  }

  /**
   * 计算预计就诊时间
   */
  private async calculateEstimatedTime(doctorId: string): Promise<Date> {
    // 查询该医生当前等待的患者数量
    const waitingCount = await this.prisma.queue.count({
      where: {
        appointment: {
          doctorId
        },
        status: QueueStatus.WAITING
      }
    });

    // 计算预计时间：当前时间 + (等待人数 * 默认就诊时间)
    const estimatedMinutes = waitingCount * this.DEFAULT_CONSULTATION_TIME;
    const estimatedTime = new Date();
    estimatedTime.setMinutes(estimatedTime.getMinutes() + estimatedMinutes);

    return estimatedTime;
  }

  /**
   * 根据ID获取排队详情
   */
  async getQueueById(id: string): Promise<QueueWithDetails | null> {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
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

      return queue as QueueWithDetails | null;
    } catch (error) {
      logger.error('获取排队详情失败:', error);
      throw new Error('获取排队详情失败');
    }
  }

  /**
   * 根据排队号码获取详情
   */
  async getQueueByNumber(queueNumber: number): Promise<QueueWithDetails | null> {
    try {
      const queue = await this.prisma.queue.findFirst({
        where: { queueNumber },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
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

      return queue as QueueWithDetails | null;
    } catch (error) {
      logger.error('获取排队详情失败:', error);
      throw new Error('获取排队详情失败');
    }
  }

  /**
   * 获取科室排队列表
   * 按优先级和创建时间排序
   */
  async getDepartmentQueue(departmentId: string): Promise<QueueWithDetails[]> {
    try {
      const queues = await this.prisma.queue.findMany({
        where: {
          appointment: {
            departmentId
          },
          status: {
            in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS]
          }
        },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
                }
              },
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: [
          { createdAt: 'asc' }
        ]
      });

      // 按优先级手动排序（EMERGENCY > URGENT > NORMAL）
      return this.sortByPriority(queues as QueueWithDetails[]);
    } catch (error) {
      logger.error('获取科室排队列表失败:', error);
      throw new Error('获取科室排队列表失败');
    }
  }

  /**
   * 获取医生排队列表
   * 按优先级和创建时间排序
   */
  async getDoctorQueue(doctorId: string): Promise<QueueWithDetails[]> {
    try {
      const queues = await this.prisma.queue.findMany({
        where: {
          appointment: {
            doctorId
          },
          status: {
            in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS]
          }
        },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
                }
              },
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: [
          { createdAt: 'asc' }
        ]
      });

      // 按优先级手动排序
      return this.sortByPriority(queues as QueueWithDetails[]);
    } catch (error) {
      logger.error('获取医生排队列表失败:', error);
      throw new Error('获取医生排队列表失败');
    }
  }

  /**
   * 按优先级排序队列
   * EMERGENCY > URGENT > NORMAL
   */
  private sortByPriority(queues: QueueWithDetails[]): QueueWithDetails[] {
    const priorityOrder = {
      [Priority.EMERGENCY]: 3,
      [Priority.URGENT]: 2,
      [Priority.NORMAL]: 1
    };

    return queues.sort((a, b) => {
      const aPriority = priorityOrder[a.appointment.priority];
      const bPriority = priorityOrder[b.appointment.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // 优先级高的排在前面
      }

      // 相同优先级按创建时间排序
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * 叫号 - 呼叫下一个患者
   */
  async callNext(doctorId: string): Promise<QueueWithDetails | null> {
    try {
      // 获取医生的排队列表
      const queues = await this.getDoctorQueue(doctorId);

      if (queues.length === 0) {
        return null;
      }

      // 找到第一个等待中的患者
      const nextQueue = queues.find(q => q.status === QueueStatus.WAITING);

      if (!nextQueue) {
        return null;
      }

      // 更新排队状态为已叫号
      const calledQueue = await this.prisma.queue.update({
        where: { id: nextQueue.id },
        data: {
          status: QueueStatus.CALLED
        },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
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

      // 更新挂号状态为就诊中,记录实际叫号时间
      await this.prisma.appointment.update({
        where: { id: nextQueue.appointmentId },
        data: {
          status: AppointmentStatus.IN_PROGRESS,
          calledAt: new Date()
        }
      });

      logger.info(`叫号成功 - 排队号: ${calledQueue.queueNumber}, 患者: ${calledQueue.appointment.patient.name}`);
      return calledQueue as QueueWithDetails;
    } catch (error) {
      logger.error('叫号失败:', error);
      throw new Error('叫号失败');
    }
  }

  /**
   * 完成就诊
   */
  async completeConsultation(id: string): Promise<QueueWithDetails> {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id },
        include: {
          appointment: true
        }
      });

      if (!queue) {
        throw new Error('排队记录不存在');
      }

      if (queue.status === QueueStatus.COMPLETED) {
        throw new Error('该患者已完成就诊');
      }

      // 更新排队状态为已完成
      const completedQueue = await this.prisma.queue.update({
        where: { id },
        data: {
          status: QueueStatus.COMPLETED,
          actualTime: new Date()
        },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
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

      // 更新挂号状态为已完成
      await this.prisma.appointment.update({
        where: { id: queue.appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
          completedAt: new Date()
        }
      });

      logger.info(`就诊完成 - 排队号: ${completedQueue.queueNumber}`);
      return completedQueue as QueueWithDetails;
    } catch (error) {
      logger.error('完成就诊失败:', error);
      throw error;
    }
  }

  /**
   * 取消排队
   */
  async cancelQueue(id: string): Promise<QueueWithDetails> {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id },
        include: {
          appointment: true
        }
      });

      if (!queue) {
        throw new Error('排队记录不存在');
      }

      if (queue.status === QueueStatus.COMPLETED) {
        throw new Error('已完成的排队不能取消');
      }

      // 更新排队状态为跳过
      const cancelledQueue = await this.prisma.queue.update({
        where: { id },
        data: {
          status: QueueStatus.SKIPPED
        },
        include: {
          appointment: {
            include: {
              patient: {
                select: {
                  name: true,
                  patientNo: true
                }
              },
              doctor: {
                include: {
                  user: {
                    select: {
                      username: true
                    }
                  }
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

      // 更新挂号状态为已取消
      await this.prisma.appointment.update({
        where: { id: queue.appointmentId },
        data: {
          status: AppointmentStatus.CANCELLED
        }
      });

      logger.info(`排队取消 - 排队号: ${cancelledQueue.queueNumber}`);
      return cancelledQueue as QueueWithDetails;
    } catch (error) {
      logger.error('取消排队失败:', error);
      throw error;
    }
  }

  /**
   * 获取排队位置信息
   */
  async getQueuePosition(id: string): Promise<{
    position: number;
    waitingCount: number;
    estimatedWaitTime: number;
  }> {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id },
        include: {
          appointment: {
            include: {
              doctor: true
            }
          }
        }
      });

      if (!queue) {
        throw new Error('排队记录不存在');
      }

      if (queue.status !== QueueStatus.WAITING) {
        return {
          position: 0,
          waitingCount: 0,
          estimatedWaitTime: 0
        };
      }

      // 获取该医生的所有等待队列
      const waitingQueues = await this.getDoctorQueue(queue.appointment.doctorId);

      // 找到当前排队的位置
      const position = waitingQueues.findIndex(q => q.id === id) + 1;
      const waitingCount = waitingQueues.filter(q => q.status === QueueStatus.WAITING).length;

      // 计算预计等待时间（分钟）
      const estimatedWaitTime = (position - 1) * this.DEFAULT_CONSULTATION_TIME;

      return {
        position,
        waitingCount,
        estimatedWaitTime
      };
    } catch (error) {
      logger.error('获取排队位置失败:', error);
      throw new Error('获取排队位置失败');
    }
  }

  /**
   * 获取科室排队统计
   */
  async getDepartmentQueueStatistics(departmentId: string): Promise<{
    totalWaiting: number;
    totalCalled: number;
    totalInProgress: number;
    totalCompleted: number;
    averageWaitTime: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        totalWaiting,
        totalCalled,
        totalInProgress,
        totalCompleted,
        completedQueues
      ] = await Promise.all([
        this.prisma.queue.count({
          where: {
            appointment: {
              departmentId,
              appointmentDate: { gte: today, lt: tomorrow }
            },
            status: QueueStatus.WAITING
          }
        }),
        this.prisma.queue.count({
          where: {
            appointment: {
              departmentId,
              appointmentDate: { gte: today, lt: tomorrow }
            },
            status: QueueStatus.CALLED
          }
        }),
        this.prisma.queue.count({
          where: {
            appointment: {
              departmentId,
              appointmentDate: { gte: today, lt: tomorrow }
            },
            status: QueueStatus.IN_PROGRESS
          }
        }),
        this.prisma.queue.count({
          where: {
            appointment: {
              departmentId,
              appointmentDate: { gte: today, lt: tomorrow }
            },
            status: QueueStatus.COMPLETED
          }
        }),
        this.prisma.queue.findMany({
          where: {
            appointment: {
              departmentId,
              appointmentDate: { gte: today, lt: tomorrow }
            },
            status: QueueStatus.COMPLETED,
            actualTime: { not: null }
          }
        })
      ]);

      // 计算平均等待时间
      let averageWaitTime = 0;
      if (completedQueues.length > 0) {
        const totalWaitTime = completedQueues.reduce((sum, queue) => {
          if (queue.actualTime && queue.createdAt) {
            const waitTime = queue.actualTime.getTime() - queue.createdAt.getTime();
            return sum + waitTime;
          }
          return sum;
        }, 0);
        averageWaitTime = Math.round(totalWaitTime / completedQueues.length / 1000 / 60); // 转换为分钟
      }

      return {
        totalWaiting,
        totalCalled,
        totalInProgress,
        totalCompleted,
        averageWaitTime
      };
    } catch (error) {
      logger.error('获取科室排队统计失败:', error);
      throw new Error('获取科室排队统计失败');
    }
  }
}
