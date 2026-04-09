import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';

type FirebaseSendResult = {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  responses: Array<{
    token: string;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;
};

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly appName = 'prohome-backend';
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  private initialize() {
    const serviceAccount = this.getServiceAccount();

    if (!serviceAccount) {
      this.logger.warn(
        'Firebase service account topilmadi. FIREBASE_SERVICE_ACCOUNT_PATH yoki FIREBASE_SERVICE_ACCOUNT_JSON ni sozlang.',
      );
      return;
    }

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      this.logger.warn(
        'Firebase service account maʼlumotlari to‘liq emas. project_id, client_email va private_key kerak.',
      );
      return;
    }

    const existingApp =
      getApps().find((app) => app.name === this.appName) ??
      initializeApp(
        {
          credential: cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
          }),
          projectId:
            this.configService.get<string>('FIREBASE_PROJECT_ID') ??
            serviceAccount.project_id,
        },
        this.appName,
      );

    this.initialized = Boolean(existingApp);
    this.logger.log('Firebase Admin muvaffaqiyatli ishga tushdi');
  }

  private getServiceAccount(): FirebaseServiceAccount | null {
    const rawJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    const filePath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    try {
      if (rawJson) {
        return JSON.parse(rawJson) as FirebaseServiceAccount;
      }

      if (filePath) {
        const fileContents = readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContents) as FirebaseServiceAccount;
      }
    } catch (error) {
      this.logger.error('Firebase service account o‘qilmadi', error);
    }

    return null;
  }

  async sendPushNotification(params: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<FirebaseSendResult> {
    if (!this.initialized) {
      throw new ServiceUnavailableException(
        'Firebase sozlanmagan. FIREBASE_SERVICE_ACCOUNT_PATH yoki FIREBASE_SERVICE_ACCOUNT_JSON ni tekshiring.',
      );
    }

    const uniqueTokens = [...new Set(params.tokens.filter(Boolean))];

    if (!uniqueTokens.length) {
      return {
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
        responses: [],
      };
    }

    const messaging = getMessaging(getApp(this.appName));
    const message: MulticastMessage = {
      tokens: uniqueTokens,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data,
    };

    const response = await messaging.sendEachForMulticast(message);
    const invalidTokens = response.responses
      .map((item, index) => ({ item, token: uniqueTokens[index] }))
      .filter(({ item }) => {
        const code = item.error?.code;
        return (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        );
      })
      .map(({ token }) => token);
    const responses = response.responses.map((item, index) => ({
      token: uniqueTokens[index],
      success: item.success,
      errorCode: item.error?.code,
      errorMessage: item.error?.message,
    }));

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
      responses,
    };
  }
}
