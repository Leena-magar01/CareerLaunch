import {
  NotificationEventType,
  NotificationTemplateParams,
  renderNotificationTemplate
} from './notificationTemplates';
import {
  InAppProvider,
  EmailProvider,
  SmsProvider,
  PushProvider,
  INotificationProvider,
  NotificationPayload
} from './notificationProviders';

// Registry of active notification providers
const providers: INotificationProvider[] = [
  new InAppProvider(),
  new EmailProvider(),
  new SmsProvider(),
  new PushProvider()
];

export interface SendNotificationOptions {
  userId: string;
  type: NotificationEventType | string;
  templateParams?: NotificationTemplateParams;
  customTitle?: string;
  customMessage?: string;
  data?: any;
  channels?: ('IN_APP' | 'EMAIL' | 'SMS' | 'PUSH')[];
}

/**
 * Centralized Notification Dispatcher
 * Dispatches In-App notifications immediately and offloads external channels asynchronously.
 */
export const notifyUser = async (options: SendNotificationOptions): Promise<void> => {
  try {
    const { userId, type, templateParams, customTitle, customMessage, data, channels } = options;

    const rendered = renderNotificationTemplate(type as NotificationEventType, templateParams || {});
    const title = customTitle || rendered.title;
    const message = customMessage || rendered.message;

    const payload: NotificationPayload = {
      userId,
      type,
      title,
      message,
      data,
      channels: channels || ['IN_APP', 'EMAIL', 'PUSH']
    };

    // 1. In-App delivery (Primary synchronous channel for dashboard state)
    const inAppProvider = providers.find(p => p.channelName === 'IN_APP');
    if (inAppProvider) {
      await inAppProvider.send(payload);
    }

    // 2. Asynchronous multi-channel dispatch (Email, SMS, Push)
    const externalChannels = (payload.channels || []).filter(c => c !== 'IN_APP');
    if (externalChannels.length > 0) {
      setImmediate(async () => {
        for (const channelName of externalChannels) {
          const provider = providers.find(p => p.channelName === channelName);
          if (provider) {
            try {
              await provider.send(payload);
            } catch (err) {
              console.warn(`Failed asynchronous dispatch for channel ${channelName}:`, err);
            }
          }
        }
      });
    }
  } catch (err) {
    console.error('Centralized notification dispatch error:', err);
  }
};

/**
 * Backwards-compatible helper for existing modules
 */
export const createNotification = async (params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}) => {
  return notifyUser({
    userId: params.userId,
    type: params.type,
    customTitle: params.title,
    customMessage: params.message,
    data: params.data
  });
};
