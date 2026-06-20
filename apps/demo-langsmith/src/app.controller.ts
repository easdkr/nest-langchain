import { Controller, Get, Query } from '@nestjs/common';

import { TraceDemoService } from './trace-demo.service';

@Controller()
export class AppController {
  constructor(private readonly traceDemoService: TraceDemoService) {}

  @Get('trace')
  trace(@Query('message') message = 'hello') {
    return this.traceDemoService.handle(message);
  }
}

