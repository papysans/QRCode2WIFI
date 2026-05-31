import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** 取当前小程序用户 openid（由 JwtAuthGuard 注入） */
export const CurrentOpenid = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.openid;
  },
);
