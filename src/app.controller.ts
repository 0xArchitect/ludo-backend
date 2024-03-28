import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { WithdrawalDto, WithdrawalResponseDto } from './dto/withdrawal.dto';
import { Throttle } from '@nestjs/throttler';
import { BalanceDto, BalanceResponseDto } from './dto/balance.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('withdraw')
  @Throttle({ default: { limit: 1, ttl: 15000 } })
  async withdraw(
    @Body() withdrawalDto: WithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    return await this.appService.withdraw(withdrawalDto);
  }

  @Get('balance')
  async deposit(@Query() query: BalanceDto): Promise<BalanceResponseDto> {
    return await this.appService.balance(query);
  }

  @Get('health')
  health(): string {
    return 'OK';
  }
}
