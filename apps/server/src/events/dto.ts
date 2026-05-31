import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EventBatchRequest, EventPayload, EventType } from '@q2w/shared';

export class EventPayloadDto implements EventPayload {
  @IsEnum(EventType)
  type!: EventType;

  @IsString()
  sid!: string;

  @IsOptional() @IsString()
  actorOpenid?: string;

  @IsString()
  visitorId!: string;

  @IsString()
  sessionId!: string;

  @IsOptional() @IsObject()
  meta?: Record<string, unknown>;

  @IsOptional() @IsString()
  clientTs?: string;
}

export class EventBatchDto implements EventBatchRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventPayloadDto)
  events!: EventPayloadDto[];
}
