import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/** 小程序用户 JWT 守卫，校验后把 openid 挂到 req.openid */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing token');
    }
    try {
      const payload = await this.jwt.verifyAsync(auth.slice(7));
      (req as any).openid = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
  }
}
