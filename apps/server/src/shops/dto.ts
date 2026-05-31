import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateShopRequest, UpdateShopRequest } from '@q2w/shared';

export class CreateShopDto implements CreateShopRequest {
  @IsString() @MinLength(1) @MaxLength(50)
  name!: string;

  @IsString() @MinLength(1) @MaxLength(64)
  wifiSsid!: string;

  @IsString() @MinLength(1) @MaxLength(128)
  wifiPassword!: string;

  @IsOptional() @IsString()
  reviewLink?: string;

  @IsOptional() @IsString()
  groupBuyLink?: string;

  @IsOptional() @IsString()
  phone?: string;
}

export class UpdateShopDto implements UpdateShopRequest {
  @IsOptional() @IsString() @MaxLength(50)
  name?: string;

  @IsOptional() @IsString() @MaxLength(64)
  wifiSsid?: string;

  @IsOptional() @IsString() @MaxLength(128)
  wifiPassword?: string;

  @IsOptional() @IsString()
  reviewLink?: string;

  @IsOptional() @IsString()
  groupBuyLink?: string;

  @IsOptional() @IsString()
  phone?: string;
}
