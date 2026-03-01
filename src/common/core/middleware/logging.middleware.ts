import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

let logQueue: any[] = [];

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;

        if (user && (user.role === UserRole.SALESMANAGER || user.role === UserRole.ROP)) {
            logQueue.push({
                userId: user.id,
                companyId: user.companyId,
                method: req.method,
                url: req.originalUrl,
                createdAt: new Date(),
            });

            if (logQueue.length >= 1) this.flushLogs();
        }
        return next.handle();
    }

    private async flushLogs() {
        if (!logQueue.length) return;
        await this.prisma.requestLog.createMany({ data: logQueue });
        logQueue = [];
    }
}
