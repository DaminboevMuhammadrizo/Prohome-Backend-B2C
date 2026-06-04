import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserData = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        return data ? user?.[data] : user;
    },
);

export const CompanyData = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const company = request.company;
        return data ? company?.[data] : company;
    },
);
