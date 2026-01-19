/**
 * 系统公告服务
 * 提供公告的创建、更新、删除、查询和发布等功能
 */

import { PrismaClient, AnnouncementType, AnnouncementPriority, AnnouncementStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateAnnouncementInput {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  targetAudience?: string;
  departmentId?: string;
  createdBy: string;
  publishedAt?: Date;
  expiresAt?: Date;
}

interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  targetAudience?: string;
  departmentId?: string;
  expiresAt?: Date;
}

interface GetAnnouncementsFilter {
  status?: AnnouncementStatus;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  departmentId?: string;
  page?: number;
  limit?: number;
}

/**
 * 创建公告
 */
export async function createAnnouncement(input: CreateAnnouncementInput) {
  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      content: input.content,
      type: input.type,
      priority: input.priority,
      status: AnnouncementStatus.DRAFT,
      targetAudience: input.targetAudience,
      departmentId: input.departmentId,
      createdBy: input.createdBy,
      publishedAt: input.publishedAt,
      expiresAt: input.expiresAt
    },
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return announcement;
}

/**
 * 更新公告
 */
export async function updateAnnouncement(id: string, input: UpdateAnnouncementInput) {
  // 检查公告是否存在且未删除
  const existing = await prisma.announcement.findFirst({
    where: {
      id,
      deletedAt: null
    }
  });

  if (!existing) {
    throw new Error('公告不存在或已删除');
  }

  // 不允许修改已发布的公告
  if (existing.status === AnnouncementStatus.PUBLISHED) {
    throw new Error('已发布的公告不允许修改，请先归档后重新发布');
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      title: input.title,
      content: input.content,
      type: input.type,
      priority: input.priority,
      targetAudience: input.targetAudience,
      departmentId: input.departmentId,
      expiresAt: input.expiresAt
    },
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return announcement;
}

/**
 * 软删除公告
 */
export async function deleteAnnouncement(id: string) {
  // 检查公告是否存在且未删除
  const existing = await prisma.announcement.findFirst({
    where: {
      id,
      deletedAt: null
    }
  });

  if (!existing) {
    throw new Error('公告不存在或已删除');
  }

  await prisma.announcement.update({
    where: { id },
    data: {
      deletedAt: new Date()
    }
  });

  return { success: true, message: '公告删除成功' };
}

/**
 * 获取单个公告详情
 */
export async function getAnnouncementById(id: string) {
  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      deletedAt: null
    },
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      },
      reads: {
        select: {
          id: true,
          userId: true,
          readAt: true
        },
        take: 100 // 最多返回100个已读记录
      }
    }
  });

  if (!announcement) {
    throw new Error('公告不存在或已删除');
  }

  return announcement;
}

/**
 * 获取公告列表（支持分页和筛选）
 */
export async function getAnnouncements(filter: GetAnnouncementsFilter) {
  const {
    status,
    type,
    priority,
    departmentId,
    page = 1,
    limit = 20
  } = filter;

  const skip = (page - 1) * limit;

  const where: any = {
    deletedAt: null
  };

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (priority) {
    where.priority = priority;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        reads: {
          select: {
            id: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit
    }),
    prisma.announcement.count({ where })
  ]);

  return {
    data: announcements.map(ann => ({
      ...ann,
      readCount: ann.reads.length,
      reads: undefined // 不返回详细已读记录
    })),
    pagination: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * 获取有效公告（已发布且未过期）
 */
export async function getActiveAnnouncements(userId?: string) {
  const now = new Date();

  const announcements = await prisma.announcement.findMany({
    where: {
      deletedAt: null,
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: {
        lte: now
      },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    },
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      },
      reads: userId ? {
        where: { userId },
        select: { id: true, readAt: true }
      } : false
    },
    orderBy: [
      { priority: 'desc' },
      { publishedAt: 'desc' }
    ]
  });

  return announcements.map(ann => ({
    ...ann,
    isRead: userId ? ann.reads && ann.reads.length > 0 : undefined,
    reads: undefined
  }));
}

/**
 * 发布公告
 */
export async function publishAnnouncement(id: string) {
  // 检查公告是否存在且未删除
  const existing = await prisma.announcement.findFirst({
    where: {
      id,
      deletedAt: null
    }
  });

  if (!existing) {
    throw new Error('公告不存在或已删除');
  }

  if (existing.status === AnnouncementStatus.PUBLISHED) {
    throw new Error('公告已发布');
  }

  // 检查过期时间是否有效
  if (existing.expiresAt && existing.expiresAt <= new Date()) {
    throw new Error('公告已过期，请修改过期时间后再发布');
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      status: AnnouncementStatus.PUBLISHED,
      publishedAt: new Date()
    },
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return announcement;
}

/**
 * 归档公告
 */
export async function archiveAnnouncement(id: string) {
  // 检查公告是否存在且未删除
  const existing = await prisma.announcement.findFirst({
    where: {
      id,
      deletedAt: null
    }
  });

  if (!existing) {
    throw new Error('公告不存在或已删除');
  }

  if (existing.status === AnnouncementStatus.ARCHIVED) {
    throw new Error('公告已归档');
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      status: AnnouncementStatus.ARCHIVED
    },
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return announcement;
}

/**
 * 标记公告为已读
 */
export async function markAnnouncementAsRead(announcementId: string, userId: string) {
  // 检查公告是否存在
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      deletedAt: null
    }
  });

  if (!announcement) {
    throw new Error('公告不存在或已删除');
  }

  // 检查是否已读
  const existingRead = await prisma.announcementRead.findFirst({
    where: {
      announcementId,
      userId
    }
  });

  if (existingRead) {
    return { success: true, message: '公告已标记为已读' };
  }

  // 创建已读记录
  await prisma.announcementRead.create({
    data: {
      announcementId,
      userId
    }
  });

  return { success: true, message: '公告已标记为已读' };
}

/**
 * 自动标记过期公告
 * 定时任务调用，将已过期的已发布公告标记为EXPIRED状态
 */
export async function autoExpireAnnouncements() {
  const now = new Date();

  const result = await prisma.announcement.updateMany({
    where: {
      status: AnnouncementStatus.PUBLISHED,
      expiresAt: {
        lte: now
      }
    },
    data: {
      status: AnnouncementStatus.EXPIRED
    }
  });

  return {
    success: true,
    expiredCount: result.count
  };
}
