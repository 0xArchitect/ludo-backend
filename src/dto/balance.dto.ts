import { IsJWT } from 'class-validator';

export class BalanceDto {
  @IsJWT({ message: 'Invalid access token' })
  accessToken: string;
}
export class BalanceResponseDto {
  balance: number;
  userId: number;
}
