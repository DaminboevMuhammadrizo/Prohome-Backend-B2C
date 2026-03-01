import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log('✅ Database successfully connected');
        } catch (error) {
            this.logger.error('❌ Database connection failed!');
            this.logger.error(error);
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.warn('⚠️ Database disconnected.');
    }
}