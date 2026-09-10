import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private redis_client: Redis;
    private logger = new Logger(RedisService.name);

    async onModuleInit() {
        this.redis_client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            maxRetriesPerRequest: 2,
        });

        this.redis_client.on('connect', () => {
            this.logger.log('✅ Redis connected');
        });

        this.redis_client.on('error', (err) => {
            this.logger.warn('❌ Redis error:', err);
        });
    }

    async set(key: string, value: string, ttlSeconds?: number) {
        if (ttlSeconds) {
            await this.redis_client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.redis_client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        return this.redis_client.get(key);
    }

    async del(key: string) {
        return this.redis_client.del(key);
    }

    // ───────────────────────── Cache helper'lar ─────────────────────────
    // Hammasi try/catch bilan — Redis o'chgan/uzilgan bo'lsa ham so'rov
    // hech qachon buzilmaydi, shunchaki cache'siz ishlaydi.

    async getJSON<T>(key: string): Promise<T | null> {
        try {
            const raw = await this.redis_client.get(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }

    async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        try {
            await this.redis_client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
            /* jim o'tkazamiz */
        }
    }

    // Namespace bo'yicha tozalash (masalan "re:*") — SCAN bilan, bloklamasdan.
    async delByPattern(pattern: string): Promise<void> {
        try {
            const stream = this.redis_client.scanStream({ match: pattern, count: 200 });
            const pipeline = this.redis_client.pipeline();
            let hasKeys = false;
            for await (const keys of stream) {
                for (const key of keys as string[]) {
                    pipeline.unlink(key);
                    hasKeys = true;
                }
            }
            if (hasKeys) await pipeline.exec();
        } catch {
            /* jim o'tkazamiz */
        }
    }

    // Asosiy cache wrapper: kalit bo'lsa cache'dan, bo'lmasa producer()'dan olib
    // cache'ga yozadi. Redis xatosida to'g'ridan producer() ishlaydi.
    async wrap<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T> {
        const cached = await this.getJSON<T>(key);
        if (cached !== null && cached !== undefined) return cached;
        const fresh = await producer();
        await this.setJSON(key, fresh, ttlSeconds);
        return fresh;
    }

    async onModuleDestroy() {
        await this.redis_client.quit();
    }
}
