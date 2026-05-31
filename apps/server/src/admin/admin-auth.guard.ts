import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/** 后台守卫：要求 token 中 role=admin，与小程序 token 隔离 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing admin token');
    }
    try {
      const payload = await this.jwt.verifyAsync(auth.slice(7));
      if (payload.role !== 'admin') {
        throw new UnauthorizedException('not an admin token');
      }
      (req as any).adminId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('invalid admin token');
    }
  }
}
