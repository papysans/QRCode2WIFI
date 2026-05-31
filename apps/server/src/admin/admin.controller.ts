import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  AnomalyResponse,
  FunnelResponse,
  OverviewResponse,
  RevenueResponse,
  ShopRankingResponse,
  TrendResponse,
} from '@q2w/shared';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AnalyticsService } from './analytics.service';
import { toCsv } from '../common/csv.util';
import { AdminLoginDto, ExportQueryDto, RangeQueryDto } from './dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: AdminLoginDto): Promise<{ token: string }> {
    return this.adminAuth.login(dto.username, dto.password);
  }

  @Get('overview')
  @UseGuards(AdminAuthGuard)
  overview(@Query() q: RangeQueryDto): Promise<OverviewResponse> {
    return this.analytics.overview(q.from, q.to);
  }

  @Get('funnel')
  @UseGuards(AdminAuthGuard)
  funnel(@Query() q: RangeQueryDto): Promise<FunnelResponse> {
    return this.analytics.funnel(q.from, q.to);
  }

  @Get('revenue')
  @UseGuards(AdminAuthGuard)
  revenue(@Query() q: RangeQueryDto): Promise<RevenueResponse> {
    return this.analytics.revenue(q.from, q.to);
  }

  @Get('shops/ranking')
  @UseGuards(AdminAuthGuard)
  ranking(@Query() q: RangeQueryDto): Promise<ShopRankingResponse> {
    return this.analytics.ranking(q.from, q.to);
  }

  @Get('trends')
  @UseGuards(AdminAuthGuard)
  trends(@Query() q: RangeQueryDto): Promise<TrendResponse> {
    return this.analytics.trends(q.from, q.to);
  }

  @Get('anomalies')
  @UseGuards(AdminAuthGuard)
  anomalies(@Query() q: RangeQueryDto): Promise<AnomalyResponse> {
    return this.analytics.anomalies(q.from, q.to);
  }

  @Get('export')
  @UseGuards(AdminAuthGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @Query() q: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    let rows: object[] = [];
    switch (q.type) {
      case 'funnel':
        rows = (await this.analytics.funnel(q.from, q.to)).steps;
        break;
      case 'revenue':
        rows = (await this.analytics.revenue(q.from, q.to)).daily;
        break;
      case 'ranking':
        rows = (await this.analytics.ranking(q.from, q.to)).items;
        break;
      case 'trends':
        rows = (await this.analytics.trends(q.from, q.to)).points;
        break;
      case 'anomalies':
        rows = (await this.analytics.anomalies(q.from, q.to)).items;
        break;
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${q.type}.csv"`,
    );
    res.send(toCsv(rows));
  }
}
