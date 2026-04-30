import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../config/jwt/jwt.service';

@Injectable()
export class RoleGuardService implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('role', context.getHandler());
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) throw new ForbiddenException('User not found in request');
    if (!requiredRoles.includes(user.role)) throw new ForbiddenException('Not enough permissions');

    return true;
  }
}
