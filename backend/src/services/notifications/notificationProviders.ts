import { prisma } from '../../config/db';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  channels?: ('IN_APP' | 'EMAIL' | 'SMS' | 'PUSH')[];
}

export interface INotificationProvider {
  channelName: string;
  send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }>;
}

/**
 * In-App Notification Delivery Provider (Database Persisted)
 */
export class InAppProvider implements INotificationProvider {
  channelName = 'IN_APP';

  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          dataJson: payload.data ? JSON.stringify(payload.data) : null,
          channel: 'IN_APP',
          isRead: false
        }
      });
      return { success: true };
    } catch (err: any) {
      console.error('InAppProvider error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

/**
 * Email Notification Delivery Provider (SMTP / Service Simulation)
 */
export class EmailProvider implements INotificationProvider {
  channelName = 'EMAIL';

  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    // Asynchronous simulated/pluggable email dispatch
    return { success: true };
  }
}

/**
 * SMS Notification Delivery Provider (Twilio / Gateway Simulation)
 */
export class SmsProvider implements INotificationProvider {
  channelName = 'SMS';

  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

/**
 * Web / Mobile Push Notification Delivery Provider (FCM / WebPush Simulation)
 */
export class PushProvider implements INotificationProvider {
  channelName = 'PUSH';

  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}
