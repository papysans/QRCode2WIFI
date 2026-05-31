import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ token: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { username },
    });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('账号或密码错误');
    }
    // role: admin 标记，与小程序 token 区分
    const token = await this.jwt.signAsync({
      sub: admin.id,
      role: 'admin',
      username: admin.username,
    });
    return { token };
  }
}
