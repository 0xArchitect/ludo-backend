import { IsOptional, IsString } from 'class-validator';

export class SignDto {
  @IsString()
  @IsOptional()
  message?: string;
  @IsString()
  @IsOptional()
  signature?: string;
  @IsString()
  @IsOptional()
  user?: string;
}
