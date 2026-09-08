import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { MessageFileType } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { ChatQueryDto, StartChatDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) {}

    // Chat boshlash yoki mavjudini qaytarish
    async startChat(user: JwtPayload, dto: StartChatDto) {
        const master = await this.prisma.master.findUnique({ where: { id: dto.masterId } });
        if (!master) throw new NotFoundException('Usta topilmadi');
        if (master.userId === user.id) throw new BadRequestException('O\'z-o\'zingiz bilan chat ochib bo\'lmaydi');

        const existing = await this.prisma.chat.findUnique({
            where: { userId_masterId: { userId: user.id, masterId: dto.masterId } },
            include: this.chatInclude(),
        });
        if (existing) return existing;

        return this.prisma.chat.create({
            data: { userId: user.id, masterId: dto.masterId },
            include: this.chatInclude(),
        });
    }

    // Foydalanuvchi chatlarini olish
    async getUserChats(user: JwtPayload, query: ChatQueryDto) {
        const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
        const [data, total] = await Promise.all([
            this.prisma.chat.findMany({
                where: { userId: user.id },
                skip,
                take: query.limit ?? 20,
                orderBy: { updatedAt: 'desc' },
                include: this.chatInclude(),
            }),
            this.prisma.chat.count({ where: { userId: user.id } }),
        ]);
        return { data, meta: { page: query.page ?? 1, limit: query.limit ?? 20, total } };
    }

    // Usta chatlarini olish
    async getMasterChats(user: JwtPayload, query: ChatQueryDto) {
        const master = await this.prisma.master.findUnique({ where: { userId: user.id } });
        if (!master) throw new ForbiddenException('Siz usta emassiz');

        const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
        const [data, total] = await Promise.all([
            this.prisma.chat.findMany({
                where: { masterId: master.id },
                skip,
                take: query.limit ?? 20,
                orderBy: { updatedAt: 'desc' },
                include: this.chatInclude(),
            }),
            this.prisma.chat.count({ where: { masterId: master.id } }),
        ]);
        return { data, meta: { page: query.page ?? 1, limit: query.limit ?? 20, total } };
    }

    // Chat xabarlarini olish (sahifalangan)
    async getMessages(chatId: number, user: JwtPayload, query: ChatQueryDto) {
        const chat = await this.findChatAndCheckAccess(chatId, user);

        const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
        const [messages, total] = await Promise.all([
            this.prisma.chatMessage.findMany({
                where: { chatId },
                skip,
                take: query.limit ?? 20,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.chatMessage.count({ where: { chatId } }),
        ]);

        // O'qilmagan xabarlarni o'qilgan deb belgilash
        const otherSenderId = user.id === chat.userId ? chat.master.userId : chat.userId;
        await this.prisma.chatMessage.updateMany({
            where: { chatId, senderId: otherSenderId, isRead: false },
            data: { isRead: true },
        });

        return { data: messages, meta: { page: query.page ?? 1, limit: query.limit ?? 20, total } };
    }

    // Xabar yuborish (matn yoki fayl)
    async sendMessage(
        chatId: number,
        user: JwtPayload,
        content?: string,
        fileUrl?: string,
        fileType?: MessageFileType,
    ) {
        if (!content && !fileUrl) throw new BadRequestException('Matn yoki fayl yuborish shart');

        const chat = await this.findChatAndCheckAccess(chatId, user);
        const senderType = user.id === chat.userId ? 'USER' : 'MASTER';

        const message = await this.prisma.chatMessage.create({
            data: {
                chatId,
                senderId: user.id,
                senderType,
                content: content ?? null,
                fileUrl: fileUrl ?? null,
                fileType: fileType ?? MessageFileType.TEXT,
            },
        });

        // Chat updatedAt ni yangilash (oxirgi xabar vaqti)
        await this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

        // Ikkinchi tomonga bildirishnoma (in-app + online bo'lsa WebSocket + FCM push)
        const recipientUserId = user.id === chat.userId ? chat.master.userId : chat.userId;
        const senderName = user.id === chat.userId
            ? [chat.user.firstName, chat.user.lastName].filter(Boolean).join(' ') || 'Foydalanuvchi'
            : [chat.master.user.firstName, chat.master.user.lastName].filter(Boolean).join(' ') || 'Usta';
        const preview = content?.trim() || {
            [MessageFileType.IMAGE]: '📷 Rasm yubordi',
            [MessageFileType.VIDEO]: '🎥 Video yubordi',
            [MessageFileType.DOCUMENT]: '📄 Fayl yubordi',
            [MessageFileType.TEXT]: 'Yangi xabar',
        }[fileType ?? MessageFileType.TEXT];
        this.notificationService.notifyChatMessage(recipientUserId, senderName, preview, chatId).catch(() => null);

        return message;
    }

    // Faqat chat ishtirokchilari kirishi mumkin
    private async findChatAndCheckAccess(chatId: number, user: JwtPayload) {
        const chat = await this.prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                master: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
            },
        });
        if (!chat) throw new NotFoundException('Chat topilmadi');

        const isMember = user.id === chat.userId || user.id === chat.master.userId;
        if (!isMember) throw new ForbiddenException('Bu chatga kirishga ruxsat yo\'q');

        return chat;
    }

    private chatInclude() {
        return {
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
            master: {
                select: {
                    id: true,
                    profileImg: true,
                    user: { select: { id: true, firstName: true, lastName: true } },
                },
            },
            messages: {
                take: 1,
                orderBy: { createdAt: 'desc' as const },
            },
        };
    }
}
