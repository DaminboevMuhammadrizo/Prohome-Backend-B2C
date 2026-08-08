import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { BotService } from './bot.service';

@ApiExcludeController()
@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('webhook')
  async webhook(@Body() update: any) {
    await this.botService.handleUpdate(update);
    return { ok: true };
  }
}
