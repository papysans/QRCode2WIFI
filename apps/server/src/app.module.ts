import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { WechatModule } from './wechat/wechat.module';
import { AdaptersModule } from './adapters/adapters.module';
import { AuthModule } from './auth/auth.module';
import { ShopsModule } from './shops/shops.module';
import { ConnectModule } from './connect/connect.module';
import { EventsModule } from './events/events.module';
import { AdminModule } from './admin/admin.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    WechatModule,
    AdaptersModule,
    AuthModule,
    ShopsModule,
    ConnectModule,
    EventsModule,
    AdminModule,
    StatsModule,
  ],
})
export class AppModule {}
