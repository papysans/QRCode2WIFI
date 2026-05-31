import { Body, Controller, Post } from '@nestjs/common';
import { EventBatchResponse } from '@q2w/shared';
import { EventsService } from './events.service';
import { EventBatchDto } from './dto';

/** 埋点上报，公开接口（顾客未登录也可上报） */
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  async ingest(@Body() dto: EventBatchDto): Promise<EventBatchResponse> {
    const accepted = await this.events.ingest(dto);
    return { accepted };
  }
}
