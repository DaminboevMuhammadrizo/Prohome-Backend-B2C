import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface DeviceSessions {
    [deviceId: string]: string[];
}

@Injectable()
export class SessionManager {
    private readonly logger = new Logger(SessionManager.name);
    private server: Server;
    private sessions: Record<string, DeviceSessions> = {};

   
    setServer(server: Server) {
        this.server = server;
    }


    registerConnection(userId: string, deviceId: string, socketId: string) {
        if (!this.sessions[userId]) this.sessions[userId] = {};
        if (!this.sessions[userId][deviceId]) this.sessions[userId][deviceId] = [];

        this.sessions[userId][deviceId].push(socketId);

        this.logger.debug(`✅ User ${userId} (${deviceId}) connected -> socket ${socketId}`);
    }

    unregisterConnection(userId: string, deviceId: string, socketId: string) {
        if (this.sessions[userId]?.[deviceId]) {
            this.sessions[userId][deviceId] =
                this.sessions[userId][deviceId].filter(id => id !== socketId);

            if (this.sessions[userId][deviceId].length === 0) {
                delete this.sessions[userId][deviceId];
            }

            if (Object.keys(this.sessions[userId]).length === 0) {
                delete this.sessions[userId];
            }

            this.logger.debug(`❌ User ${userId} (${deviceId}) disconnected -> socket ${socketId}`);
        }
    }

    emitToUser(userId: string, event: string, payload: unknown) {
        const devices = this.sessions[userId] || {};
        Object.values(devices).forEach(socketIds => {
            socketIds.forEach(id => this.server.to(id).emit(event, payload));
        });
    }

    emitToDevice(userId: string, deviceId: string, event: string, payload: unknown) {
        const sockets = this.sessions[userId]?.[deviceId] || [];
        sockets.forEach(id => this.server.to(id).emit(event, payload));
    }


    joinRoom(userId: string, deviceId: string, roomId: string) {
        const sockets = this.sessions[userId]?.[deviceId] || [];
        sockets.forEach(id => this.server.sockets.sockets.get(id)?.join(roomId));
        this.logger.debug(`👥 User ${userId} joined room ${roomId}`);
    }

  
    leaveRoom(userId: string, deviceId: string, roomId: string) {
        const sockets = this.sessions[userId]?.[deviceId] || [];
        sockets.forEach(id => this.server.sockets.sockets.get(id)?.leave(roomId));
        this.logger.debug(`👤 User ${userId} left room ${roomId}`);
    }


    emitToRoom(roomId: string, event: string, payload: unknown) {
        this.server.to(roomId).emit(event, payload);
        this.logger.debug(`📢 Event "${event}" sent to room ${roomId}`);
    }

 
    listOnlineUsers(): string[] {
        return Object.keys(this.sessions);
    }
    

    listUserDevices(userId: string): string[] {
        return Object.keys(this.sessions[userId] || {});
    }

    isUserConnected(userId: string): boolean {
        return !!this.sessions[userId];
    }

    sendImage(userId: string, url: string) {
        const html = `<img src="${url}" alt="image" style="max-width:300px; border-radius:8px;" />`;
        this.emitToUser(userId, 'file-message', { type: 'image', html });
    }

   
    sendAudio(userId: string, url: string) {
        const html = `
        <audio controls style="width:250px;">
            <source src="${url}" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>`;
        this.emitToUser(userId, 'file-message', { type: 'audio', html });
    }

    sendVideo(userId: string, url: string) {
        const html = `
        <video controls style="max-width:300px; border-radius:8px;">
            <source src="${url}" type="video/mp4">
            Your browser does not support the video tag.
        </video>`;
        this.emitToUser(userId, 'file-message', { type: 'video', html });
    }

 
    sendFile(userId: string, url: string, filename: string) {
        const html = `
        <a href="${url}" download="${filename}" 
           style="color:blue; text-decoration:underline;">
           📎 ${filename}
        </a>`;
        this.emitToUser(userId, 'file-message', { type: 'file', html });
    }

    getAllOnlineUsers(): string[] {
        return Object.keys(this.sessions);
    }

}
