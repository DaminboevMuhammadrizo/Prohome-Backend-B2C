import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_TTL } from '../config/redis/cache.constants';
import { RedisService } from '../config/redis/redis.service';

export const CACHE_NS_KEY = 'cache_ns';
export const CACHE_TTL_KEY = 'cache_ttl';

// Controller yoki handler'ga qo'yiladi: shu (GET) endpoint javobi Redis'da
// `<ns>:http:<url>` kaliti bilan keshlanadi. Invalidatsiya — tegishli servisda
// `redis.delByPattern('<ns>:*')` orqali (yozuv paytida).
export const CacheResource = (ns: string, ttlSeconds: number = CACHE_TTL) =>
  (target: any, key?: any, descriptor?: any) => {
    SetMetadata(CACHE_NS_KEY, ns)(target, key, descriptor);
    SetMetadata(CACHE_TTL_KEY, ttlSeconds)(target, key, descriptor);
  };

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET') return next.handle();

    const ns =
      this.reflector.get<string>(CACHE_NS_KEY, context.getHandler()) ??
      this.reflector.get<string>(CACHE_NS_KEY, context.getClass());
    if (!ns) return next.handle();

    const ttl =
      this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler()) ??
      this.reflector.get<number>(CACHE_TTL_KEY, context.getClass()) ??
      CACHE_TTL;

    const key = `${ns}:http:${Buffer.from(req.originalUrl || req.url).toString('base64url')}`;

    const cached = await this.redis.getJSON(key);
    if (cached !== null && cached !== undefined) return of(cached);

    return next.handle().pipe(
      tap((body) => {
        if (body !== undefined && body !== null) void this.redis.setJSON(key, body, ttl);
      }),
    );
  }
}
