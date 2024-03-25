import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SignDto } from './dto/sign.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async withdraw(@Body() signDto: SignDto) {
    return await this.appService.withdraw(signDto);
  }
}
