import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsString() @IsNotEmpty()
  username!: string;

  @IsString() @IsNotEmpty()
  password!: string;
}

export class RangeQueryDto {
  @IsOptional() @IsString()
  from?: string;

  @IsOptional() @IsString()
  to?: string;
}

export class ExportQueryDto extends RangeQueryDto {
  @IsIn(['funnel', 'revenue', 'ranking', 'trends', 'anomalies'])
  type!: 'funnel' | 'revenue' | 'ranking' | 'trends' | 'anomalies';
}
