import { IsJWT, IsNumber, IsPositive, IsString } from 'class-validator';

export class WithdrawalDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsJWT({ message: 'Invalid access token' })
  accessToken: string;

  @IsString()
  user_address: string;
}
