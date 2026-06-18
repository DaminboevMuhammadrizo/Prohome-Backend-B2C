import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtServices, type JwtPayload } from 'src/common/config/jwt/jwt.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(
        private readonly jwtService: JwtServices,
        private readonly prisma: PrismaService,
        private readonly chatService: ChatService,
    ) {}

    // ─── Ulanishda JWT tekshirish ────────────────────────────────────────────
    async handleConnection(client: Socket) {
        try {
            const token =
                (client.handshake.auth?.token as string) ||
                (client.handshake.headers?.authorization as string)?.split(' ')[1];

            if (!token) throw new Error('Token yo\'q');

            const payload = await this.jwtService.verifyAccessToken(token);
            if ('type' in payload) throw new Error('Kompaniya tokeni chat uchun yaroqsiz');

            client.data.user = payload as JwtPayload;
        } catch {
            client.emit('error', 'Autentifikatsiya xatosi');
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // cleanup ixtiyoriy — socket.io rooms avtomatik tozalanadi
    }

    // ─── Chat xonasiga qo'shilish ────────────────────────────────────────────
    @SubscribeMessage('join_chat')
    async handleJoinChat(@ConnectedSocket() client: Socket, @MessageBody() chatId: number) {
        const user: JwtPayload = client.data.user;
        if (!user) throw new WsException('Autentifikatsiya xatosi');

        const chat = await this.prisma.chat.findUnique({
            where: { id: chatId },
            include: { master: { select: { userId: true } } },
        });
        if (!chat) throw new WsException('Chat topilmadi');

        const isMember = user.id === chat.userId || user.id === chat.master.userId;
        if (!isMember) throw new WsException('Bu chatga kirishga ruxsat yo\'q');

        await client.join(`chat:${chatId}`);
        return { event: 'joined', data: { chatId } };
    }

    // ─── Chat xonasidan chiqish ──────────────────────────────────────────────
    @SubscribeMessage('leave_chat')
    handleLeaveChat(@ConnectedSocket() client: Socket, @MessageBody() chatId: number) {
        client.leave(`chat:${chatId}`);
        return { event: 'left', data: { chatId } };
    }

    // ─── Matn xabar yuborish ─────────────────────────────────────────────────
    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { chatId: number; content: string },
    ) {
        const user: JwtPayload = client.data.user;
        if (!user) throw new WsException('Autentifikatsiya xatosi');
        if (!payload?.content?.trim()) throw new WsException('Xabar bo\'sh bo\'lishi mumkin emas');

        const message = await this.chatService.sendMessage(
            payload.chatId,
            user,
            payload.content.trim(),
        );

        this.server.to(`chat:${payload.chatId}`).emit('new_message', message);
        return { event: 'sent', data: message };
    }

    // ─── Yozilmoqda indikatori ───────────────────────────────────────────────
    @SubscribeMessage('typing')
    handleTyping(@ConnectedSocket() client: Socket, @MessageBody() chatId: number) {
        const user: JwtPayload = client.data.user;
        client.to(`chat:${chatId}`).emit('typing', { chatId, senderId: user?.id });
    }

    // ─── REST orqali fayl yuborilganda WS orqali xabar chiqarish ────────────
    emitToChat(chatId: number, message: any) {
        this.server.to(`chat:${chatId}`).emit('new_message', message);
    }
}
