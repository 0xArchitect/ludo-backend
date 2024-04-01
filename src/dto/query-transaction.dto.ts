import { IsInt, IsJWT, IsPositive, Max, Min } from 'class-validator';

export class QueryTransactionDto {
  @IsInt()
  @Min(0)
  offset?: number = 0;
  @IsInt()
  @IsPositive()
  @Max(100)
  limit?: number = 20;

  @IsJWT({ message: 'Invalid access token' })
  accessToken: string;
}
export class QueryTransactionResponseDto {
  amount: number;
  address: string;
  txHash: string;
  type: string;
  createdAt: Date;
}
