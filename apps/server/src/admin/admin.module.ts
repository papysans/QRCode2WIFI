import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AdminController],
  providers: [AdminAuthService, AdminAuthGuard, AnalyticsService],
  exports: [AnalyticsService],
})
export class AdminModule {}
