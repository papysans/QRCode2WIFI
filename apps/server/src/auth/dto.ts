import { IsNotEmpty, IsString } from 'class-validator';
import { LoginRequest } from '@q2w/shared';

export class LoginDto implements LoginRequest {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
