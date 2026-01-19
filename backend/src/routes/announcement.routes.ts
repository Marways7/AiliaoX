/**
 * 系统公告路由
 * 提供公告管理的API端点
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { Permission } from '../auth/types';
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  AnnouncementSearchSchema
} from '../validation/schemas';
import * as announcementService from '../services/announcement.service';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/v1/announcements
 * 创建公告（ADMIN权限）
 */
router.post(
  '/',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.SYSTEM_MANAGE),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CreateAnnouncementSchema.parse(req.body);

      const announcement = await announcementService.createAnnouncement({
        ...validatedData,
        createdBy: req.user!.userId,
        publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : undefined,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
      });

      logger.info(`公告创建成功: ${announcement.id}`, { userId: req.user!.userId });

      res.status(201).json({
        success: true,
        message: '公告创建成功',
        data: announcement
      });
    } catch (error: any) {
      logger.error('创建公告失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '创建公告失败'
      });
    }
  }
);

/**
 * PUT /api/v1/announcements/:id
 * 更新公告（ADMIN权限）
 */
router.put(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.SYSTEM_MANAGE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = UpdateAnnouncementSchema.parse(req.body);

      const announcement = await announcementService.updateAnnouncement(id, {
        ...validatedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
      });

      logger.info(`公告更新成功: ${id}`, { userId: req.user!.userId });

      res.json({
        success: true,
        message: '公告更新成功',
        data: announcement
      });
    } catch (error: any) {
      logger.error('更新公告失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新公告失败'
      });
    }
  }
);

/**
 * DELETE /api/v1/announcements/:id
 * 删除公告（ADMIN权限）
 */
router.delete(
  '/:id',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.SYSTEM_MANAGE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await announcementService.deleteAnnouncement(id);

      logger.info(`公告删除成功: ${id}`, { userId: req.user!.userId });

      res.json(result);
    } catch (error: any) {
      logger.error('删除公告失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '删除公告失败'
      });
    }
  }
);

/**
 * GET /api/v1/announcements/:id
 * 获取公告详情（已登录）
 */
router.get(
  '/:id',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const announcement = await announcementService.getAnnouncementById(id);

      res.json({
        success: true,
        data: announcement
      });
    } catch (error: any) {
      logger.error('获取公告详情失败', error);
      res.status(404).json({
        success: false,
        message: error.message || '获取公告详情失败'
      });
    }
  }
);

/**
 * GET /api/v1/announcements
 * 获取公告列表（已登录，支持分页和筛选）
 */
router.get(
  '/',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery = AnnouncementSearchSchema.parse(req.query);

      const result = await announcementService.getAnnouncements(validatedQuery);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      logger.error('获取公告列表失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '获取公告列表失败'
      });
    }
  }
);

/**
 * GET /api/v1/announcements/active/list
 * 获取有效公告（已登录）
 */
router.get(
  '/active/list',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const announcements = await announcementService.getActiveAnnouncements(req.user!.userId);

      res.json({
        success: true,
        data: announcements
      });
    } catch (error: any) {
      logger.error('获取有效公告失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '获取有效公告失败'
      });
    }
  }
);

/**
 * POST /api/v1/announcements/:id/publish
 * 发布公告（ADMIN权限）
 */
router.post(
  '/:id/publish',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.SYSTEM_MANAGE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const announcement = await announcementService.publishAnnouncement(id);

      logger.info(`公告发布成功: ${id}`, { userId: req.user!.userId });

      res.json({
        success: true,
        message: '公告发布成功',
        data: announcement
      });
    } catch (error: any) {
      logger.error('发布公告失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '发布公告失败'
      });
    }
  }
);

/**
 * POST /api/v1/announcements/:id/archive
 * 归档公告（ADMIN权限）
 */
router.post(
  '/:id/archive',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.SYSTEM_MANAGE),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const announcement = await announcementService.archiveAnnouncement(id);

      logger.info(`公告归档成功: ${id}`, { userId: req.user!.userId });

      res.json({
        success: true,
        message: '公告归档成功',
        data: announcement
      });
    } catch (error: any) {
      logger.error('归档公告失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '归档公告失败'
      });
    }
  }
);

/**
 * POST /api/v1/announcements/:id/read
 * 标记公告为已读（已登录）
 */
router.post(
  '/:id/read',
  authMiddleware.authenticate(),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await announcementService.markAnnouncementAsRead(id, req.user!.userId);

      res.json(result);
    } catch (error: any) {
      logger.error('标记公告已读失败', error);
      res.status(400).json({
        success: false,
        message: error.message || '标记公告已读失败'
      });
    }
  }
);

export default router;
