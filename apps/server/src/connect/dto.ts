import { IsNotEmpty, IsString } from 'class-validator';
import { UnlockRequest } from '@q2w/shared';

export class UnlockDto implements UnlockRequest {
  @IsString() @IsNotEmpty()
  sessionId!: string;

  @IsString() @IsNotEmpty()
  adToken!: string;
}
