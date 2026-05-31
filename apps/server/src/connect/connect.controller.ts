import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PublicShopView, UnlockResponse } from '@q2w/shared';
import { ConnectService } from './connect.service';
import { UnlockDto } from './dto';

/** 顾客侧公开接口，无需登录 */
@Controller('connect')
export class ConnectController {
  constructor(private readonly connect: ConnectService) {}

  @Get(':sid')
  getPublic(@Param('sid') sid: string): Promise<PublicShopView> {
    return this.connect.getPublic(sid);
  }

  @Post(':sid/unlock')
  unlock(
    @Param('sid') sid: string,
    @Body() dto: UnlockDto,
  ): Promise<UnlockResponse> {
    return this.connect.unlock(sid, dto);
  }
}
