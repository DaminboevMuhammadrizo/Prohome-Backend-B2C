import { Global, Module } from '@nestjs/common';
import { InteractionBufferService } from './interaction-buffer.service';

@Global()
@Module({
  providers: [InteractionBufferService],
  exports: [InteractionBufferService],
})
export class InteractionBufferModule {}
