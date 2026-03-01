import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RedisModule } from "./redis/redis.module";

@Module({
    imports: [JwtModule, RedisModule,JwtModule],
    controllers: [],
    providers: []
})
export class ConfigModule { }