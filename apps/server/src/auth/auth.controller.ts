import { Body, Controller, Post } from '@nestjs/common';
import { LoginResponse } from '@q2w/shared';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto.code);
  }
}
