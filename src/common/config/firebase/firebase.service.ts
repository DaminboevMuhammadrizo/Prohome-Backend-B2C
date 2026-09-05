import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging, MulticastMessage } from 'firebase-admin/messaging';

// Loyiha ildizidagi (package.json bilan bir qatorda) fayl — hech qachon git'ga tushmaydi (.gitignore'da)
const SERVICE_ACCOUNT_PATH = join(process.cwd(), 'firebase-service-account.json');

// Push-notification (FCM) wrapper. Siz boshqa loyihangizda ishlatgan
// FirebaseService'ga mos — service-account.json fayl orqali ishlaydi.
// Farqi: fayl topilmasa ilova qulab tushmaydi, shunchaki push o'chirilgan holatda
// ishlaydi (in-app/WebSocket bildirishnomalar baribir davom etadi).
@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;
  private messaging: Messaging | null = null;

  constructor(private readonly config: ConfigService) {
    const serviceAccount = this.loadServiceAccount();
    if (!serviceAccount) {
      this.logger.warn(
        `Firebase service-account topilmadi (${SERVICE_ACCOUNT_PATH} yoki FIREBASE_* env) — push o'chirilgan, faqat in-app/WebSocket bildirishnomalar ishlaydi`,
      );
      return;
    }

    try {
      this.app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
      this.messaging = getMessaging(this.app);
      this.logger.log('Firebase ishga tushdi ✅');
    } catch (e) {
      this.logger.error('Firebase ishga tushirishda xatolik', e as Error);
    }
  }

  // 1) loyiha ildizidagi firebase-service-account.json fayldan (tavsiya etiladi)
  // 2) topilmasa — .env'dagi FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY'dan
  private loadServiceAccount(): { projectId: string; clientEmail: string; privateKey: string } | null {
    if (existsSync(SERVICE_ACCOUNT_PATH)) {
      try {
        const raw = require(SERVICE_ACCOUNT_PATH);
        if (raw.project_id && raw.client_email && raw.private_key) {
          return { projectId: raw.project_id, clientEmail: raw.client_email, privateKey: raw.private_key };
        }
      } catch (e) {
        this.logger.error(`${SERVICE_ACCOUNT_PATH} o'qib bo'lmadi`, e as Error);
      }
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    if (projectId && clientEmail && privateKey) {
      return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') };
    }

    return null;
  }

  isEnabled() {
    return !!this.messaging;
  }

  async sendToToken(params: { token: string; title: string; body: string; data?: Record<string, string> }) {
    if (!this.messaging) return null;
    const { token, title, body, data } = params;
    return this.messaging.send({ token, notification: { title, body }, data });
  }

  async sendToTokens(params: { tokens: string[]; title: string; body: string; data?: Record<string, string> }) {
    if (!this.messaging) return { successCount: 0, failureCount: 0, responses: [] };

    const { tokens, title, body, data } = params;
    if (!tokens?.length) return { successCount: 0, failureCount: 0, responses: [] };

    const uniqueTokens = [...new Set(tokens)];
    const message: MulticastMessage = { tokens: uniqueTokens, notification: { title, body }, data };
    return this.messaging.sendEachForMulticast(message);
  }
}
