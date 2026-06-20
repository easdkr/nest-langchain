import { Injectable } from '@nestjs/common';
import { TraceableRun } from '@nest-langchain/langsmith';

@Injectable()
export class TraceDemoService {
  @TraceableRun({
    name: 'Demo trace handler',
    runType: 'chain',
    tags: ['demo', 'langsmith'],
  })
  async handle(message: string) {
    return {
      message,
      reversed: message.split('').reverse().join(''),
    };
  }
}

