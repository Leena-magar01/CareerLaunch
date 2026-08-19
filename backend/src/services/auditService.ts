import { prisma } from '../config/db';

export const createAuditLog = async (params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldDataJson?: string;
  newDataJson?: string;
  reason?: string;
}) => {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldDataJson: params.oldDataJson,
        newDataJson: params.newDataJson,
        reason: params.reason,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
};

export const createNotification = async (params: {
  userId: string;
  type: string;
  title: string;
  message: string;
}) => {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
      },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};
