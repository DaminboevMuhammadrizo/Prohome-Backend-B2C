import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtServices, type JwtPayload } from 'src/common/config/jwt/jwt.service';

// Foydalanuvchi online bo'lsa, bildirishnomani darhol real-time yetkazish uchun.
// chat.gateway.ts patterniga mos: JWT handshake orqali autentifikatsiya, har bir
// foydalanuvchi o'z shaxsiy xonasiga (`user:{id}`) qo'shiladi.
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'notifications' })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(private readonly jwtService: JwtServices) {}

    async handleConnection(client: Socket) {
        try {
            const token =
                (client.handshake.auth?.token as string) ||
                (client.handshake.headers?.authorization as string)?.split(' ')[1];

            if (!token) throw new Error('Token yo\'q');

            const payload = await this.jwtService.verifyAccessToken(token);
            if ('type' in payload) throw new Error('Kompaniya tokeni bu yerga yaroqsiz');

            client.data.user = payload as JwtPayload;
            await client.join(`user:${payload.id}`);
        } catch {
            client.emit('error', 'Autentifikatsiya xatosi');
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // cleanup ixtiyoriy — socket.io rooms avtomatik tozalanadi
    }

    // NotificationService tomonidan chaqiriladi — foydalanuvchi online bo'lsa darhol yetkaziladi
    emitToUser(userId: number, notification: any) {
        this.server.to(`user:${userId}`).emit('new_notification', notification);
    }
}
