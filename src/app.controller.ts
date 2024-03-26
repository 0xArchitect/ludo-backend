import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { WithdrawalDto } from './dto/withdrawal.dto';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('withdraw')
  @Throttle({ default: { limit: 1, ttl: 15000 } })
  async withdraw(@Body() withdrawalDto: WithdrawalDto) {
    return await this.appService.withdraw(withdrawalDto);
  }

  // @Post('deposit')
  // async deposit() {
  //   return await this.appService.deposit('rijulagarwal0909@llll.com');
  // }
}
